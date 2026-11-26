import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  Point,
  ScaleZone,
  MeasurementItem,
  EdgeTag,
  DrawingSheet
} from '../types/takeoff';
import {
  distancePixels,
  snapPoint,
  getActiveScaleZone,
  expandCenterline,
  formatDim,
  getPolygonEdges,
  lineLengthMeters,
  polygonAreaMeters
} from '../utils/geometry';
import {
  Maximize2,
  ZoomIn,
  ZoomOut,
  Crosshair,
  Compass,
  Layers,
  Sparkles,
  Move,
  Tag,
  CheckCircle2,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  Ruler,
  X,
  Check,
  Hand,
  MousePointer
} from 'lucide-react';

interface BlueprintCanvasProps {
  sheet: DrawingSheet;
  activeRevision: 'RevA' | 'RevB';
  scaleZones: ScaleZone[];
  measurements: MeasurementItem[];
  selectedMeasurementId: string | null;
  activeTool: 'select' | 'line' | 'polygon' | 'rectangle' | 'void' | 'count' | 'calibrate';
  activeFolderId: string;
  onSelectMeasurement: (id: string | null) => void;
  onCompleteMeasurement: (measurement: Partial<MeasurementItem>) => void;
  onUpdateMeasurement: (id: string, updates: Partial<MeasurementItem>) => void;
  onCalibrateZone?: (zoneId: string, measuredPx: number, realMeters: number, ratio?: string) => void;
  onOpenScaleModal?: () => void;
  onCancelCalibrate?: () => void;
  isMagnetEnabled: boolean;
  isMagnifierEnabled: boolean;
  onToggleMagnet: () => void;
  onToggleMagnifier: () => void;
  isSideBySideView?: boolean;
  onChangePage?: (sheetId: string, pageNum: number) => void;
  onSelectTool?: (tool: 'select' | 'line' | 'polygon' | 'rectangle' | 'void' | 'count' | 'calibrate') => void;
}

export const BlueprintCanvas: React.FC<BlueprintCanvasProps> = ({
  sheet,
  activeRevision,
  scaleZones,
  measurements,
  selectedMeasurementId,
  activeTool,
  activeFolderId,
  onSelectMeasurement,
  onCompleteMeasurement,
  onUpdateMeasurement,
  onCalibrateZone,
  onOpenScaleModal,
  onCancelCalibrate,
  isMagnetEnabled,
  isMagnifierEnabled,
  onToggleMagnet,
  onToggleMagnifier,
  isSideBySideView = false,
  onChangePage,
  onSelectTool
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Viewport Transform (Pan & Zoom)
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<Point>({ x: 40, y: 30 });
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState<Point>({ x: 0, y: 0 });

  // Mouse & Snapping tracking
  const [mousePos, setMousePos] = useState<Point>({ x: 0, y: 0 });
  const [cursorCanvasPos, setCursorCanvasPos] = useState<Point>({ x: 0, y: 0 });
  const [snappedPos, setSnappedPos] = useState<Point>({ x: 0, y: 0 });
  const [snapInfo, setSnapInfo] = useState<{ snapped: boolean; type?: string }>({ snapped: false });

  // Drawing state
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);

  // Dragging existing vertex in edit/select mode
  const [draggedVertex, setDraggedVertex] = useState<{ measurementId: string; pointIndex: number } | null>(null);

  // Calibration tool state
  const [calibrationPoints, setCalibrationPoints] = useState<Point[]>([]);
  const [pendingCalibration, setPendingCalibration] = useState<{
    pt1: Point;
    pt2: Point;
    pixelDistance: number;
    zoneId: string;
  } | null>(null);
  const [calibrationInputMeters, setCalibrationInputMeters] = useState<string>('5.0');

  // Reset calibration when activeTool changes
  React.useEffect(() => {
    if (activeTool !== 'calibrate') {
      setCalibrationPoints([]);
      setPendingCalibration(null);
    }
  }, [activeTool]);

  // Escape key cancels calibration or current drawing
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (pendingCalibration) {
          setPendingCalibration(null);
          setCalibrationPoints([]);
        } else if (calibrationPoints.length > 0) {
          setCalibrationPoints([]);
        } else if (isDrawing) {
          setIsDrawing(false);
          setCurrentPoints([]);
        } else if (activeTool === 'calibrate') {
          onCancelCalibrate?.();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pendingCalibration, calibrationPoints, isDrawing, activeTool, onCancelCalibrate]);

  // Collect all existing vertices for vector magnet snapping
  const existingVertices = React.useMemo(() => {
    const pts: Point[] = [];
    measurements.forEach(m => {
      m.points.forEach(p => pts.push(p));
    });
    // Add known drawing architectural snap points for CAD precision
    if (sheet.id === 'sheet_arch_gf') {
      const archPoints: Point[] = [
        { x: 120, y: 140 }, { x: 420, y: 140 }, { x: 680, y: 140 },
        { x: 120, y: 380 }, { x: 420, y: 380 }, { x: 680, y: 380 },
        { x: 120, y: 560 }, { x: 420, y: 560 }, { x: 680, y: 560 },
        { x: 160, y: 280 }, { x: 260, y: 280 }, { x: 260, y: 340 }, { x: 160, y: 340 }
      ];
      pts.push(...archPoints);
    }
    return pts;
  }, [measurements, sheet.id]);

  // Convert client viewport coordinates to SVG canvas coordinates
  const clientToCanvas = useCallback(
    (clientX: number, clientY: number): Point => {
      if (!containerRef.current) return { x: 0, y: 0 };
      const rect = containerRef.current.getBoundingClientRect();
      const x = (clientX - rect.left - pan.x) / zoom;
      const y = (clientY - rect.top - pan.y) / zoom;
      return { x, y };
    },
    [pan, zoom]
  );

  // Handle Mouse Move
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const rawClientPos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    setMousePos(rawClientPos);

    if (isPanning) {
      setPan({
        x: e.clientX - startPan.x,
        y: e.clientY - startPan.y
      });
      return;
    }

    const canvasPos = clientToCanvas(e.clientX, e.clientY);
    setCursorCanvasPos(canvasPos);

    if (draggedVertex) {
      // Dragging a vertex in edit mode (or Revision sync mode)
      const measurement = measurements.find(m => m.id === draggedVertex.measurementId);
      if (measurement) {
        const newPoints = [...measurement.points];
        newPoints[draggedVertex.pointIndex] = { ...canvasPos };
        onUpdateMeasurement(measurement.id, { points: newPoints });
      }
      return;
    }

    // Magnet snapping
    if (isMagnetEnabled && activeTool !== 'select') {
      const lastPoint = currentPoints.length > 0 ? currentPoints[currentPoints.length - 1] : undefined;
      const snapRes = snapPoint(canvasPos, existingVertices, lastPoint, 16 / zoom);
      setSnappedPos(snapRes.point);
      setSnapInfo({ snapped: snapRes.snapped, type: snapRes.type });
    } else {
      setSnappedPos(canvasPos);
      setSnapInfo({ snapped: false });
    }
  };

  // Unified point processing for both Mouse clicks and Touch taps
  const handlePointInput = (clickPoint: Point) => {
    // Calibration tool
    if (activeTool === 'calibrate') {
      const newCal = [...calibrationPoints, clickPoint];
      setCalibrationPoints(newCal);
      if (newCal.length === 2) {
        const pxDist = distancePixels(newCal[0], newCal[1]);
        if (pxDist > 5) {
          const activeZone = getActiveScaleZone(newCal[0], scaleZones);
          setPendingCalibration({
            pt1: newCal[0],
            pt2: newCal[1],
            pixelDistance: pxDist,
            zoneId: activeZone?.id || 'sz_main'
          });
          // Pick a reasonable initial guess based on existing scale
          const currentPxPerM = activeZone?.pixelsPerMeter || 40;
          const guessedMeters = Math.max(0.5, Math.round((pxDist / currentPxPerM) * 10) / 10);
          setCalibrationInputMeters(guessedMeters.toString());
        } else {
          // If clicked the exact same point twice, keep point 1
          setCalibrationPoints([newCal[0]]);
        }
      }
      return;
    }

    // Drawing Tools
    if (activeTool === 'count') {
      const activeZone = getActiveScaleZone(clickPoint, scaleZones);
      onCompleteMeasurement({
        name: 'Door / Opening Count',
        folderId: activeFolderId,
        tool: 'count',
        points: [clickPoint],
        color: '#f59e0b',
        scaleZoneId: activeZone.id,
        recipeType: 'count',
        recipeConfig: {
          itemType: 'Door Opening (900mm)',
          width: 0.9,
          unitRate: 250
        },
        hiddenDimensionsPrompted: false,
        isUnlinkedMultiplier: false,
        revision: activeRevision
      });
      return;
    }

    if (activeTool === 'line') {
      if (!isDrawing) {
        setIsDrawing(true);
        setCurrentPoints([clickPoint]);
      } else {
        const nextPoints = [...currentPoints, clickPoint];
        setCurrentPoints(nextPoints);
      }
      return;
    }

    if (activeTool === 'polygon' || activeTool === 'void') {
      if (!isDrawing) {
        setIsDrawing(true);
        setCurrentPoints([clickPoint]);
      } else {
        // Check if clicking close to the start point to close polygon
        if (currentPoints.length >= 3 && distancePixels(clickPoint, currentPoints[0]) < 24 / zoom) {
          finishPolygon(currentPoints);
        } else {
          setCurrentPoints([...currentPoints, clickPoint]);
        }
      }
      return;
    }

    if (activeTool === 'rectangle') {
      if (!isDrawing) {
        setIsDrawing(true);
        setCurrentPoints([clickPoint]);
      } else {
        const p1 = currentPoints[0];
        const p2 = clickPoint;
        const rectPoints: Point[] = [
          { x: p1.x, y: p1.y },
          { x: p2.x, y: p1.y },
          { x: p2.x, y: p2.y },
          { x: p1.x, y: p2.y }
        ];
        finishPolygon(rectPoints);
      }
    }
  };

  // Handle Mouse Down
  const handleMouseDown = (e: React.MouseEvent) => {
    // Middle click or Space key hold or activeTool === 'select' with drag
    if (e.button === 1 || e.altKey || (activeTool === 'select' && e.target === svgRef.current)) {
      setIsPanning(true);
      setStartPan({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      return;
    }

    if (e.button !== 0) return; // Left click only for drawing

    const clickPoint = isMagnetEnabled && snapInfo.snapped ? snappedPos : cursorCanvasPos;
    handlePointInput(clickPoint);
  };

  // Touch & Mobile Gesture Tracking (Pinch-to-zoom, two-finger pan, single-finger tap/drag)
  const touchStateRef = useRef<{
    startDist: number;
    startMidX: number;
    startMidY: number;
    startPan: Point;
    startZoom: number;
    touchStartX: number;
    touchStartY: number;
    hasDragged: boolean;
    isMultiTouch: boolean;
  }>({
    startDist: 0,
    startMidX: 0,
    startMidY: 0,
    startPan: { x: 0, y: 0 },
    startZoom: 1,
    touchStartX: 0,
    touchStartY: 0,
    hasDragged: false,
    isMultiTouch: false
  });

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();

    if (e.touches.length === 2) {
      // Multi-touch Pinch to Zoom & Pan
      const t0 = e.touches[0];
      const t1 = e.touches[1];
      const dist = Math.hypot(t0.clientX - t1.clientX, t0.clientY - t1.clientY);
      const midX = (t0.clientX + t1.clientX) / 2 - rect.left;
      const midY = (t0.clientY + t1.clientY) / 2 - rect.top;

      touchStateRef.current = {
        startDist: dist,
        startMidX: midX,
        startMidY: midY,
        startPan: { ...pan },
        startZoom: zoom,
        touchStartX: midX,
        touchStartY: midY,
        hasDragged: true,
        isMultiTouch: true
      };
      setIsPanning(true);
    } else if (e.touches.length === 1) {
      const t = e.touches[0];
      touchStateRef.current = {
        startDist: 0,
        startMidX: 0,
        startMidY: 0,
        startPan: { ...pan },
        startZoom: zoom,
        touchStartX: t.clientX,
        touchStartY: t.clientY,
        hasDragged: false,
        isMultiTouch: false
      };

      const canvasPos = clientToCanvas(t.clientX, t.clientY);
      setCursorCanvasPos(canvasPos);
      setMousePos({ x: t.clientX - rect.left, y: t.clientY - rect.top });

      if (isMagnetEnabled && activeTool !== 'select') {
        const lastPoint = currentPoints.length > 0 ? currentPoints[currentPoints.length - 1] : undefined;
        const snapRes = snapPoint(canvasPos, existingVertices, lastPoint, 24 / zoom);
        setSnappedPos(snapRes.point);
        setSnapInfo({ snapped: snapRes.snapped, type: snapRes.type });
      } else {
        setSnappedPos(canvasPos);
        setSnapInfo({ snapped: false });
      }

      if (activeTool === 'select') {
        setIsPanning(true);
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();

    if (e.touches.length === 2 && touchStateRef.current.isMultiTouch) {
      // Dynamic Pinch-to-zoom
      const t0 = e.touches[0];
      const t1 = e.touches[1];
      const dist = Math.hypot(t0.clientX - t1.clientX, t0.clientY - t1.clientY);
      const curMidX = (t0.clientX + t1.clientX) / 2 - rect.left;
      const curMidY = (t0.clientY + t1.clientY) / 2 - rect.top;

      const { startDist, startZoom, startPan, startMidX, startMidY } = touchStateRef.current;
      if (startDist > 5) {
        const scaleFactor = dist / startDist;
        const newZoom = Math.min(Math.max(startZoom * scaleFactor, 0.2), 6);
        const panX = curMidX - (startMidX - startPan.x) * (newZoom / startZoom) + (curMidX - startMidX);
        const panY = curMidY - (startMidY - startPan.y) * (newZoom / startZoom) + (curMidY - startMidY);

        setZoom(newZoom);
        setPan({ x: panX, y: panY });
      }
    } else if (e.touches.length === 1) {
      const t = e.touches[0];
      const dx = t.clientX - touchStateRef.current.touchStartX;
      const dy = t.clientY - touchStateRef.current.touchStartY;

      if (Math.hypot(dx, dy) > 8) {
        touchStateRef.current.hasDragged = true;
      }

      if (activeTool === 'select' || isPanning) {
        setPan({
          x: touchStateRef.current.startPan.x + dx,
          y: touchStateRef.current.startPan.y + dy
        });
      } else {
        // Track position for crosshair / magnet preview on mobile
        const canvasPos = clientToCanvas(t.clientX, t.clientY);
        setCursorCanvasPos(canvasPos);
        setMousePos({ x: t.clientX - rect.left, y: t.clientY - rect.top });

        if (isMagnetEnabled) {
          const lastPoint = currentPoints.length > 0 ? currentPoints[currentPoints.length - 1] : undefined;
          const snapRes = snapPoint(canvasPos, existingVertices, lastPoint, 24 / zoom);
          setSnappedPos(snapRes.point);
          setSnapInfo({ snapped: snapRes.snapped, type: snapRes.type });
        } else {
          setSnappedPos(canvasPos);
          setSnapInfo({ snapped: false });
        }
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length === 0) {
      setIsPanning(false);

      // If this was a clean tap (not dragged, not a pinch zoom)
      if (!touchStateRef.current.hasDragged && !touchStateRef.current.isMultiTouch) {
        const tapX = touchStateRef.current.touchStartX;
        const tapY = touchStateRef.current.touchStartY;
        const canvasPos = clientToCanvas(tapX, tapY);

        let clickPoint = canvasPos;
        if (isMagnetEnabled && activeTool !== 'select') {
          const lastPoint = currentPoints.length > 0 ? currentPoints[currentPoints.length - 1] : undefined;
          const snapRes = snapPoint(canvasPos, existingVertices, lastPoint, 28 / zoom);
          if (snapRes.snapped) {
            clickPoint = snapRes.point;
          }
        }

        handlePointInput(clickPoint);
      }

      touchStateRef.current.isMultiTouch = false;
      touchStateRef.current.hasDragged = false;
    } else if (e.touches.length === 1) {
      // 1 finger left after 2-finger pinch
      const t = e.touches[0];
      touchStateRef.current.isMultiTouch = false;
      touchStateRef.current.touchStartX = t.clientX;
      touchStateRef.current.touchStartY = t.clientY;
      touchStateRef.current.startPan = { ...pan };
    }
  };

  const handleTouchCancel = () => {
    setIsPanning(false);
    touchStateRef.current.isMultiTouch = false;
    touchStateRef.current.hasDragged = false;
  };

  // Handle Double Click to finish line or polygon
  const handleDoubleClick = () => {
    if (isDrawing && currentPoints.length >= 2) {
      if (activeTool === 'line') {
        finishLine(currentPoints);
      } else if ((activeTool === 'polygon' || activeTool === 'void') && currentPoints.length >= 3) {
        finishPolygon(currentPoints);
      }
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    setDraggedVertex(null);
  };

  const finishLine = (pts: Point[]) => {
    setIsDrawing(false);
    setCurrentPoints([]);
    const activeZone = getActiveScaleZone(pts[0], scaleZones);
    const isTrenchFolder = activeFolderId.includes('substructure') || activeFolderId.includes('ground');

    onCompleteMeasurement({
      name: isTrenchFolder ? 'Foundation Trench Line' : 'Wall Line (Center-line)',
      folderId: activeFolderId,
      tool: 'line',
      points: pts,
      color: isTrenchFolder ? '#ea580c' : '#dc2626',
      scaleZoneId: activeZone.id,
      recipeType: isTrenchFolder ? 'trench' : 'wall',
      recipeConfig: isTrenchFolder
        ? {
            centerLineWidth: 0.6,
            depth: 0.85,
            outputCenterline: true,
            outputVolume: true,
            outputBeddingArea: true,
            outputShoring: true
          }
        : {
            height: 2.8,
            thickness: 0.23,
            outputLinear: true,
            outputArea: true,
            outputVolume: true,
            outputFormwork: false
          },
      hiddenDimensionsPrompted: false,
      isUnlinkedMultiplier: false,
      revision: activeRevision
    });
  };

  const finishPolygon = (pts: Point[]) => {
    setIsDrawing(false);
    setCurrentPoints([]);
    const activeZone = getActiveScaleZone(pts[0], scaleZones);
    const isVoid = activeTool === 'void';
    const isRoof = activeFolderId.includes('roof');
    const isCeiling = activeFolderId.includes('ceiling');

    let recipeType: 'roof' | 'ceiling' | 'floor' = 'floor';
    let defaultColor = '#0284c7';
    let defaultRecipeConfig: any = {
      thickness: 0.15,
      outputNetArea: true,
      outputPerimeter: true,
      outputSkirting: true,
      autoDeductDoors: true,
      defaultDoorWidth: 0.9,
      outputSlabVolume: true
    };

    if (isVoid) {
      defaultColor = '#ec4899';
    } else if (isRoof) {
      recipeType = 'roof';
      defaultColor = '#8b5cf6';
      defaultRecipeConfig = {
        pitchDegrees: 30,
        outputPlanArea: true,
        outputSlopedArea: true,
        outputRidge: true,
        outputValley: true,
        outputEave: true,
        outputHip: true,
        outputRake: true
      };
    } else if (isCeiling) {
      recipeType = 'ceiling';
      defaultColor = '#06b6d4';
      defaultRecipeConfig = {
        bulkheadDrop: 0.35,
        outputCeilingArea: true,
        outputBulkheadTotal: true,
        outputCornice: true
      };
    }

    onCompleteMeasurement({
      name: isVoid ? 'Void / Opening Deduction' : isRoof ? 'Roof Pitched Slope' : isCeiling ? 'Ceiling Bulkhead' : 'Floor & Room Area',
      folderId: activeFolderId,
      tool: isVoid ? 'void' : 'polygon',
      points: pts,
      color: defaultColor,
      scaleZoneId: activeZone.id,
      recipeType,
      recipeConfig: defaultRecipeConfig,
      hiddenDimensionsPrompted: false,
      isUnlinkedMultiplier: false,
      isVoid,
      revision: activeRevision
    });
  };

  // Natural scroll with wheel, or zoom with Ctrl+wheel
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
      // Zoom towards mouse position when holding Ctrl/Cmd or pinching
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      const newZoom = Math.min(Math.max(zoom * delta, 0.2), 6);

      const newPanX = mouseX - (mouseX - pan.x) * (newZoom / zoom);
      const newPanY = mouseY - (mouseY - pan.y) * (newZoom / zoom);

      setZoom(newZoom);
      setPan({ x: newPanX, y: newPanY });
    } else {
      // Natural scrolling up and down the plan page!
      setPan(p => ({
        x: p.x - (e.shiftKey ? e.deltaY : e.deltaX),
        y: p.y - (e.shiftKey ? e.deltaX : e.deltaY)
      }));
    }
  };

  const handleScrollUp = () => setPan(p => ({ ...p, y: p.y + 120 }));
  const handleScrollDown = () => setPan(p => ({ ...p, y: p.y - 120 }));
  const handleScrollLeft = () => setPan(p => ({ ...p, x: p.x + 120 }));
  const handleScrollRight = () => setPan(p => ({ ...p, x: p.x - 120 }));

  const handleResetZoom = () => {
    setZoom(1);
    setPan({ x: 40, y: 30 });
  };

  // Cycle roof edge tag
  const handleEdgeTagClick = (m: MeasurementItem, edgeIndex: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const currentTags = { ...(m.edgeTags || {}) };
    const currentTag = currentTags[edgeIndex] || 'none';
    const tagCycle: EdgeTag[] = ['none', 'ridge', 'valley', 'eave', 'hip', 'rake'];
    const nextTag = tagCycle[(tagCycle.indexOf(currentTag) + 1) % tagCycle.length];
    currentTags[edgeIndex] = nextTag;
    onUpdateMeasurement(m.id, { edgeTags: currentTags });
  };

  // Active live calculation during drawing for live readout
  const activeScale = getActiveScaleZone(cursorCanvasPos, scaleZones);
  const pxPerM = activeScale ? activeScale.pixelsPerMeter : 40;

  let liveMeasureLabel = '';
  if (isDrawing && currentPoints.length > 0) {
    const endPt = isMagnetEnabled && snapInfo.snapped ? snappedPos : cursorCanvasPos;
    const allPts = [...currentPoints, endPt];
    if (activeTool === 'line') {
      const lenM = lineLengthMeters(allPts, pxPerM);
      liveMeasureLabel = `${formatDim(lenM)} m`;
    } else if (activeTool === 'polygon' || activeTool === 'void' || activeTool === 'rectangle') {
      if (allPts.length >= 3) {
        const areaM = polygonAreaMeters(allPts, pxPerM);
        liveMeasureLabel = `${formatDim(areaM)} m²`;
      } else {
        const segLen = lineLengthMeters(allPts, pxPerM);
        liveMeasureLabel = `${formatDim(segLen)} m`;
      }
    }
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full select-none overflow-hidden bg-slate-100/90 font-sans"
      onMouseMove={handleMouseMove}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onDoubleClick={handleDoubleClick}
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
      style={{
        cursor: isPanning ? 'grabbing' : activeTool === 'select' ? 'default' : 'crosshair',
        touchAction: 'none'
      }}
    >
      {/* Top HUD Controls - Responsive on Mobile */}
      <div className="absolute top-3 left-3 z-30 flex items-center gap-1.5 sm:gap-2 bg-white/95 backdrop-blur-md px-2.5 sm:px-3.5 py-1.5 rounded-xl border border-slate-200 shadow-sm text-xs text-slate-800 max-w-[calc(100vw-130px)] sm:max-w-none overflow-hidden">
        <div className="flex items-center gap-1.5 font-bold text-blue-700 shrink-0">
          <Layers className="w-4 h-4" />
          <span className="truncate max-w-[85px] sm:max-w-none">{sheet.title}</span>
        </div>

        {/* Multi-page PDF pagination */}
        {sheet.pageCount && sheet.pageCount > 1 && (
          <>
            <span className="text-slate-300 hidden sm:inline">•</span>
            <div className="hidden sm:flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-200 text-xs">
              <button
                disabled={(sheet.currentPage || 1) <= 1}
                onClick={() => onChangePage?.(sheet.id, (sheet.currentPage || 1) - 1)}
                className="px-1 text-slate-600 hover:text-slate-900 disabled:opacity-30 disabled:hover:text-slate-600 font-bold cursor-pointer"
                title="Previous PDF Page"
              >
                ◀
              </button>
              <span className="font-mono text-blue-700 font-bold text-[11px]">
                {sheet.currentPage || 1}/{sheet.pageCount}
              </span>
              <button
                disabled={(sheet.currentPage || 1) >= sheet.pageCount}
                onClick={() => onChangePage?.(sheet.id, (sheet.currentPage || 1) + 1)}
                className="px-1 text-slate-600 hover:text-slate-900 disabled:opacity-30 disabled:hover:text-slate-600 font-bold cursor-pointer"
                title="Next PDF Page"
              >
                ▶
              </button>
            </div>
          </>
        )}

        <span className="text-slate-300 hidden sm:inline">•</span>
        <div className="hidden sm:flex items-center gap-1">
          <span className="px-2 py-0.5 rounded-md bg-blue-50 border border-blue-200 text-blue-700 font-mono font-bold text-[11px]">
            {activeRevision}
          </span>
          {sheet.hasRevisions && (
            <span className="text-slate-500 text-[11px] truncate max-w-[80px]">
              {activeRevision === 'RevA' ? sheet.revALabel : sheet.revBLabel}
            </span>
          )}
        </div>
        <span className="text-slate-300">•</span>
        <button
          onClick={onOpenScaleModal}
          title="Click to view scale settings, standard presets, or calibrate ruler"
          className="flex items-center gap-1 text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-200 transition font-mono font-semibold text-[11px] cursor-pointer shadow-2xs shrink-0"
        >
          <Compass className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          <span>{activeScale?.ratio}</span>
          <span className="hidden md:inline text-emerald-600 font-normal">({activeScale?.pixelsPerMeter} px/m)</span>
        </button>
      </div>

      {/* Top Right Tool Bar Overlay */}
      <div className="absolute top-3 right-3 z-30 flex items-center gap-1 bg-white/95 backdrop-blur-md p-1 sm:p-1.5 rounded-xl border border-slate-200 shadow-sm">
        {/* Magnet Snapping Toggle */}
        <button
          onClick={onToggleMagnet}
          title="Vector Magnet Snapping (snaps to vertices, midpoints, orthogonal lines)"
          className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
            isMagnetEnabled
              ? 'bg-emerald-600 text-white shadow-xs font-semibold'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Magnet</span>
        </button>

        {/* 2x Magnifier Glass Loupe Toggle */}
        <button
          onClick={onToggleMagnifier}
          title="2x Precision Loupe Magnifier for raster scans"
          className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
            isMagnifierEnabled
              ? 'bg-blue-600 text-white shadow-xs font-semibold'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Crosshair className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Loupe</span>
        </button>

        {/* Desktop Zoom Controls */}
        <div className="hidden sm:flex items-center">
          <div className="h-4 w-[1px] bg-slate-200 mx-1" />
          <button
            onClick={() => setZoom(z => Math.min(z * 1.25, 6))}
            title="Zoom In"
            className="p-1 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <span className="text-[11px] font-mono text-slate-500 font-bold px-1">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom(z => Math.max(z * 0.8, 0.2))}
            title="Zoom Out"
            className="p-1 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleResetZoom}
            title="Reset Zoom (100%)"
            className="p-1 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Mobile Floating Vertical Quick Zoom & Pan Palette */}
      <div className="sm:hidden absolute right-3 top-16 z-30 flex flex-col items-center gap-1.5 bg-white/95 backdrop-blur-md p-1.5 rounded-2xl border border-slate-200 shadow-md">
        {onSelectTool && (
          <button
            onClick={() => onSelectTool(activeTool === 'select' ? 'line' : 'select')}
            title={activeTool === 'select' ? 'Pan Mode (Active)' : 'Switch to Pan Hand'}
            className={`p-2 rounded-xl transition cursor-pointer ${
              activeTool === 'select'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Hand className="w-4 h-4" />
          </button>
        )}
        <div className="w-5 h-[1px] bg-slate-200" />
        <button
          onClick={() => setZoom(z => Math.min(z * 1.3, 6))}
          title="Zoom In"
          className="p-2 rounded-xl text-slate-700 hover:bg-slate-100 transition cursor-pointer active:scale-90"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <span className="text-[10px] font-mono font-bold text-slate-600 select-none">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={() => setZoom(z => Math.max(z * 0.75, 0.2))}
          title="Zoom Out"
          className="p-2 rounded-xl text-slate-700 hover:bg-slate-100 transition cursor-pointer active:scale-90"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={handleResetZoom}
          title="Reset to Center"
          className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition cursor-pointer active:scale-90"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Mobile-Friendly Floating Action Bar for Completing/Cancelling Active Drawings */}
      {isDrawing && (
        <div className="absolute top-14 sm:top-16 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 bg-slate-900/95 backdrop-blur-md text-white px-3.5 py-2 rounded-2xl shadow-2xl border border-slate-700 animate-in fade-in slide-in-from-top-3 max-w-[92vw]">
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-xs font-semibold">
              {currentPoints.length} pt{currentPoints.length !== 1 ? 's' : ''}
            </span>
          </div>
          {currentPoints.length >= (activeTool === 'line' ? 2 : 3) && (
            <button
              onClick={() => {
                if (activeTool === 'line') finishLine(currentPoints);
                else if (activeTool === 'polygon' || activeTool === 'void') finishPolygon(currentPoints);
              }}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-xs cursor-pointer active:scale-95 transition shrink-0"
            >
              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Finish {activeTool === 'line' ? 'Wall' : 'Room'}</span>
            </button>
          )}
          <button
            onClick={() => {
              setIsDrawing(false);
              setCurrentPoints([]);
            }}
            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium cursor-pointer active:scale-95 transition shrink-0"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Floating Calibration Helper on Canvas */}
      {activeTool === 'calibrate' && calibrationPoints.length === 1 && (
        <div className="absolute top-14 sm:top-16 left-1/2 -translate-x-1/2 z-40 bg-amber-500 text-slate-900 px-3.5 py-2 rounded-2xl shadow-xl font-bold text-xs animate-bounce flex items-center gap-2">
          <span>Tap 2nd point to set known dimension</span>
          <button
            onClick={() => {
              setCalibrationPoints([]);
              onCancelCalibrate?.();
            }}
            className="text-[11px] bg-amber-700 text-white px-2 py-0.5 rounded-lg cursor-pointer"
          >
            Cancel
          </button>
        </div>
      )}

      {/* SVG Drawing Canvas */}
      <svg
        ref={svgRef}
        className="w-full h-full"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: '0 0'
        }}
      >
        <defs>
          {/* Engineering Grid Patterns */}
          <pattern id="grid-small" width="10" height="10" patternUnits="userSpaceOnUse">
            <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#f1f5f9" strokeWidth="0.5" />
          </pattern>
          <pattern id="grid-major" width="50" height="50" patternUnits="userSpaceOnUse">
            <rect width="50" height="50" fill="url(#grid-small)" />
            <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#e2e8f0" strokeWidth="1" />
          </pattern>
          {/* Void Hatch pattern */}
          <pattern id="void-hatch" width="8" height="8" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
            <line x1="0" y1="0" x2="0" y2="8" stroke="#3b82f6" strokeWidth="2" strokeOpacity="0.3" />
          </pattern>
        </defs>

        {/* Blueprint Canvas Background */}
        <rect
          x="0"
          y="0"
          width={sheet.width || 1100}
          height={sheet.height || 750}
          fill="#ffffff"
          stroke="#cbd5e1"
          strokeWidth="1"
        />
        {!sheet.url && (
          <rect x="0" y="0" width={sheet.width || 1100} height={sheet.height || 750} fill="url(#grid-major)" opacity="0.9" />
        )}

        {/* Uploaded PDF or Image Drawing Plan */}
        {sheet.url && (
          <g id="uploaded-plan-layer">
            <image
              href={sheet.url}
              x="0"
              y="0"
              width={sheet.width || 1100}
              height={sheet.height || 750}
              preserveAspectRatio="xMidYMid meet"
            />
          </g>
        )}

        {/* ============================================================ */}
        {/* SCALE ZONES VISUALIZATION                                    */}
        {/* ============================================================ */}
        {scaleZones.map(zone => {
          if (!zone.bounds) return null;
          const { x, y, width, height } = zone.bounds;
          const isMain = zone.isDefault;
          return (
            <g key={zone.id} className="pointer-events-none">
              <rect
                x={x}
                y={y}
                width={width}
                height={height}
                fill="none"
                stroke={isMain ? '#2563eb' : '#059669'}
                strokeWidth="1.5"
                strokeDasharray={isMain ? '6 4' : '4 3'}
                opacity="0.6"
              />
              <rect
                x={x + 5}
                y={y + 5}
                width="135"
                height="22"
                fill="#ffffff"
                stroke="#e2e8f0"
                strokeWidth="1"
                rx="4"
                opacity="0.9"
              />
              <text
                x={x + 12}
                y={y + 20}
                fill={isMain ? '#1d4ed8' : '#047857'}
                fontSize="11"
                fontFamily="monospace"
                fontWeight="bold"
              >
                {zone.name}
              </text>
            </g>
          );
        })}

        {/* ============================================================ */}
        {/* ARCHITECTURAL CAD VECTOR DRAWING RENDERING                   */}
        {/* ============================================================ */}
        {sheet.id === 'sheet_arch_gf' && (
          <g id="cad-drawing-arch">
            {/* Outer Building Perimeter / Walls */}
            {/* Rev B has Master Bedroom extended to x=730 (+1.2m) */}
            {(() => {
              const bedExtX = activeRevision === 'RevB' ? 728 : 680;
              return (
                <>
                  {/* Outer Wall Cavity Hatch & Lines */}
                  <path
                    d={`M 120 140 L ${bedExtX} 140 L ${bedExtX} 380 L 420 380 L 420 560 L 120 560 Z`}
                    fill="none"
                    stroke="#1e293b"
                    strokeWidth="8"
                    strokeLinejoin="round"
                  />
                  <path
                    d={`M 120 140 L ${bedExtX} 140 L ${bedExtX} 380 L 420 380 L 420 560 L 120 560 Z`}
                    fill="none"
                    stroke="#2563eb"
                    strokeWidth="2"
                    strokeLinejoin="round"
                  />

                  {/* Internal Partition Walls */}
                  <line x1="420" y1="140" x2="420" y2="380" stroke="#334155" strokeWidth="6" />
                  <line x1="120" y1="380" x2="420" y2="380" stroke="#334155" strokeWidth="6" />
                  <line x1="260" y1="380" x2="260" y2="560" stroke="#334155" strokeWidth="6" />

                  {/* Revision B Delta indicator callout */}
                  {activeRevision === 'RevB' && (
                    <g className="animate-pulse">
                      <rect x="670" y="130" width="60" height="260" fill="#10b981" fillOpacity="0.15" stroke="#059669" strokeWidth="1.5" strokeDasharray="4 2" />
                      <text x="685" y="270" fill="#047857" fontSize="11" fontWeight="bold" fontFamily="monospace">
                        REV B EXTENSION (+1.2m)
                      </text>
                    </g>
                  )}

                  {/* Doors (Method 2 Door Deduction visual cue) */}
                  {/* Balcony Door */}
                  <path d="M 420 220 A 36 36 0 0 1 456 256" fill="none" stroke="#2563eb" strokeWidth="1.5" strokeDasharray="3 2" />
                  <line x1="420" y1="220" x2="420" y2="256" stroke="#2563eb" strokeWidth="2.5" />

                  {/* Room Entry Door */}
                  <path d="M 120 240 A 36 36 0 0 0 156 204" fill="none" stroke="#2563eb" strokeWidth="1.5" strokeDasharray="3 2" />
                  <line x1="120" y1="240" x2="120" y2="204" stroke="#2563eb" strokeWidth="2.5" />

                  {/* Master Bedroom Door */}
                  <path d="M 420 300 A 36 36 0 0 1 456 336" fill="none" stroke="#2563eb" strokeWidth="1.5" strokeDasharray="3 2" />
                  <line x1="420" y1="300" x2="420" y2="336" stroke="#2563eb" strokeWidth="2.5" />

                  {/* Windows */}
                  <line x1="200" y1="140" x2="340" y2="140" stroke="#0284c7" strokeWidth="4" />
                  <line x1="500" y1="140" x2="620" y2="140" stroke="#0284c7" strokeWidth="4" />
                  <line x1="120" y1="440" x2="120" y2="520" stroke="#0284c7" strokeWidth="4" />

                  {/* Staircase Void Opening in Living Room */}
                  <rect x="160" y="280" width="100" height="60" fill="#dbeafe" fillOpacity="0.4" stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="4 2" />
                  <line x1="160" y1="280" x2="260" y2="340" stroke="#3b82f6" strokeWidth="1" strokeOpacity="0.6" />
                  <line x1="160" y1="340" x2="260" y2="280" stroke="#3b82f6" strokeWidth="1" strokeOpacity="0.6" />
                  <text x="175" y="315" fill="#1d4ed8" fontSize="10" fontFamily="sans-serif" fontWeight="bold">
                    VOID OPENING
                  </text>

                  {/* Room Labels */}
                  <text x="240" y="220" fill="#0f172a" fontSize="14" fontWeight="bold" textAnchor="middle">
                    LIVING & DINING
                  </text>
                  <text x="240" y="238" fill="#64748b" fontSize="11" textAnchor="middle">
                    Area ~45.0m² • Clg Ht: 2.80m
                  </text>

                  <text x={activeRevision === 'RevB' ? '575' : '550'} y="230" fill="#0f172a" fontSize="14" fontWeight="bold" textAnchor="middle">
                    MASTER BEDROOM
                  </text>
                  <text x={activeRevision === 'RevB' ? '575' : '550'} y="248" fill="#64748b" fontSize="11" textAnchor="middle">
                    {activeRevision === 'RevB' ? 'Area ~32.8m² (Extended)' : 'Area ~26.4m²'}
                  </text>

                  <text x="190" y="470" fill="#0f172a" fontSize="13" fontWeight="bold" textAnchor="middle">
                    KITCHEN
                  </text>
                  <text x="340" y="470" fill="#0f172a" fontSize="13" fontWeight="bold" textAnchor="middle">
                    BEDROOM 2
                  </text>

                  {/* Dimension Strings (40px = 1.0m) */}
                  {/* Top dimension: 120 to 420 is 300px = 7.50m */}
                  <g stroke="#94a3b8" strokeWidth="1" fontSize="10" fill="#1e40af" fontFamily="monospace">
                    <line x1="120" y1="100" x2="420" y2="100" />
                    <line x1="120" y1="92" x2="120" y2="108" />
                    <line x1="420" y1="92" x2="420" y2="108" />
                    <text x="270" y="95" textAnchor="middle" fontWeight="bold">7.50 m</text>

                    {/* Right dimension for Bed */}
                    <line x1="420" y1="100" x2={bedExtX} y2="100" />
                    <line x1={bedExtX} y1="92" x2={bedExtX} y2="108" />
                    <text x={(420 + bedExtX) / 2} y="95" textAnchor="middle" fontWeight="bold">
                      {activeRevision === 'RevB' ? '7.70 m' : '6.50 m'}
                    </text>

                    {/* Left vertical dimension: 140 to 380 is 240px = 6.00m */}
                    <line x1="80" y1="140" x2="80" y2="380" />
                    <line x1="72" y1="140" x2="88" y2="140" />
                    <line x1="72" y1="380" x2="88" y2="380" />
                    <text x="70" y="265" textAnchor="end" transform="rotate(-90 70 265)" fontWeight="bold">6.00 m</text>
                  </g>
                </>
              );
            })()}

            {/* Detail Callout Box A (1:20 scale zone) */}
            <g id="detail-callout-a">
              <rect x="740" y="420" width="220" height="220" fill="#090d16" stroke="#eab308" strokeWidth="1.5" />
              <rect x="740" y="420" width="220" height="24" fill="#eab308" fillOpacity="0.15" />
              <text x="750" y="437" fill="#fde047" fontSize="11" fontWeight="bold" fontFamily="monospace">
                DETAIL A: EXTERNAL WALL (1:20)
              </text>
              {/* Detail cross section components */}
              <rect x="770" y="460" width="30" height="150" fill="#dc2626" fillOpacity="0.3" stroke="#dc2626" strokeWidth="1" />
              <rect x="800" y="460" width="20" height="150" fill="#e2e8f0" fillOpacity="0.1" stroke="#94a3b8" strokeWidth="1" strokeDasharray="2 2" />
              <rect x="820" y="460" width="40" height="150" fill="#71717a" fillOpacity="0.3" stroke="#a1a1aa" strokeWidth="1" />
              <text x="785" y="625" fill="#94a3b8" fontSize="9" textAnchor="middle">Facing Brick (102mm)</text>
              <text x="810" y="455" fill="#f59e0b" fontSize="8" textAnchor="middle">50mm Cavity</text>
              <text x="840" y="625" fill="#94a3b8" fontSize="9" textAnchor="middle">Blockwork (100mm)</text>
            </g>

            {/* Architectural Title Block */}
            <g transform="translate(740, 650)">
              <rect width="320" height="85" fill="#020617" stroke="#334155" strokeWidth="1" rx="4" />
              <text x="12" y="22" fill="#38bdf8" fontSize="13" fontWeight="bold">QS-TAKEOFF PRO PROJECT</text>
              <text x="12" y="38" fill="#94a3b8" fontSize="10">DRAWING: GROUND FLOOR ARCHITECTURAL PLAN</text>
              <text x="12" y="52" fill="#64748b" fontSize="10">
                ISSUE: {activeRevision === 'RevA' ? 'REV A (TENDER)' : 'REV B (CONSTRUCTION)'} • SCALE: 1:100 / 1:20
              </text>
              <text x="12" y="68" fill="#10b981" fontSize="9" fontFamily="monospace">
                VERIFIED QUANTITY SURVEYOR CERTIFIED
              </text>
            </g>
          </g>
        )}

        {/* ============================================================ */}
        {/* SUBSTRUCTURE / FOUNDATION TRENCHES DRAWING                   */}
        {/* ============================================================ */}
        {sheet.id === 'sheet_foundation' && (
          <g id="cad-drawing-foundation">
            {/* Grid Lines */}
            {[100, 300, 500, 700].map((gx, idx) => (
              <g key={`grid-x-${idx}`} stroke="#475569" strokeWidth="0.8" strokeDasharray="6 3">
                <line x1={gx} y1="60" x2={gx} y2="540" />
                <circle cx={gx} cy="50" r="14" fill="#1e293b" stroke="#38bdf8" strokeWidth="1" />
                <text x={gx} y="54" fill="#38bdf8" fontSize="11" textAnchor="middle" fontWeight="bold">
                  {idx + 1}
                </text>
              </g>
            ))}
            {[120, 290, 460].map((gy, idx) => (
              <g key={`grid-y-${idx}`} stroke="#475569" strokeWidth="0.8" strokeDasharray="6 3">
                <line x1="60" y1={gy} x2="740" y2={gy} />
                <circle cx="50" cy={gy} r="14" fill="#1e293b" stroke="#38bdf8" strokeWidth="1" />
                <text x="50" y={gy + 4} fill="#38bdf8" fontSize="11" textAnchor="middle" fontWeight="bold">
                  {String.fromCharCode(65 + idx)}
                </text>
              </g>
            ))}

            {/* Strip Footing Trench Center-lines and Offset Visuals */}
            <path
              d="M 100 120 L 700 120 L 700 460 L 100 460 Z"
              fill="none"
              stroke="#ea580c"
              strokeWidth="24"
              strokeLinejoin="round"
              strokeOpacity="0.25"
            />
            <path
              d="M 100 120 L 700 120 L 700 460 L 100 460 Z"
              fill="none"
              stroke="#ea580c"
              strokeWidth="2"
              strokeDasharray="4 2"
            />
            {/* Internal Trench cross beams */}
            <line x1="300" y1="120" x2="300" y2="460" stroke="#ea580c" strokeWidth="24" strokeOpacity="0.25" />
            <line x1="300" y1="120" x2="300" y2="460" stroke="#ea580c" strokeWidth="2" strokeDasharray="4 2" />
            <line x1="500" y1="120" x2="500" y2="460" stroke="#ea580c" strokeWidth="24" strokeOpacity="0.25" />
            <line x1="500" y1="120" x2="500" y2="460" stroke="#ea580c" strokeWidth="2" strokeDasharray="4 2" />

            {/* Column Pad Footings */}
            {[
              { x: 100, y: 120 }, { x: 700, y: 120 },
              { x: 100, y: 460 }, { x: 700, y: 460 }
            ].map((col, i) => (
              <g key={`col-${i}`}>
                <rect x={col.x - 24} y={col.y - 24} width="48" height="48" fill="#f97316" fillOpacity="0.4" stroke="#f97316" strokeWidth="1.5" />
                <line x1={col.x - 10} y1={col.y - 10} x2={col.x + 10} y2={col.y + 10} stroke="#ffffff" strokeWidth="1" />
                <line x1={col.x - 10} y1={col.y + 10} x2={col.x + 10} y2={col.y - 10} stroke="#ffffff" strokeWidth="1" />
              </g>
            ))}

            <text x="400" y="240" fill="#fdba74" fontSize="14" fontWeight="bold" textAnchor="middle">
              600mm STRIP FOOTINGS & TRENCH EXCAVATION
            </text>
            <text x="400" y="260" fill="#94a3b8" fontSize="11" textAnchor="middle">
              Depth: 850mm • Centerline Offset Tool Enabled
            </text>
          </g>
        )}

        {/* ============================================================ */}
        {/* ROOF FRAMING & GEOMETRY PLAN                                 */}
        {/* ============================================================ */}
        {sheet.id === 'sheet_roof' && (
          <g id="cad-drawing-roof">
            {/* Outer Eaves Perimeter */}
            <polygon
              points="100,100 680,100 680,480 100,480"
              fill="none"
              stroke="#8b5cf6"
              strokeWidth="3"
            />
            {/* Ridge Line */}
            <line x1="260" y1="290" x2="520" y2="290" stroke="#c084fc" strokeWidth="3.5" />
            <text x="390" y="280" fill="#d8b4fe" fontSize="11" fontWeight="bold" textAnchor="middle">
              RIDGE (Tagged Edge)
            </text>

            {/* Hips & Valleys */}
            <line x1="100" y1="100" x2="260" y2="290" stroke="#a855f7" strokeWidth="2.5" />
            <line x1="100" y1="480" x2="260" y2="290" stroke="#a855f7" strokeWidth="2.5" />
            <line x1="680" y1="100" x2="520" y2="290" stroke="#a855f7" strokeWidth="2.5" />
            <line x1="680" y1="480" x2="520" y2="290" stroke="#a855f7" strokeWidth="2.5" />

            {/* Slope pitch arrows */}
            <g stroke="#a855f7" strokeWidth="1.5" fill="#a855f7">
              {/* North Slope */}
              <line x1="390" y1="260" x2="390" y2="140" markerEnd="url(#arrow)" />
              <text x="390" y="180" fill="#e9d5ff" fontSize="12" fontWeight="bold" textAnchor="middle">
                30° PITCH (Factor: 1.1547)
              </text>
              {/* South Slope */}
              <line x1="390" y1="320" x2="390" y2="440" />
              <text x="390" y="380" fill="#e9d5ff" fontSize="12" fontWeight="bold" textAnchor="middle">
                30° PITCH (Factor: 1.1547)
              </text>
            </g>

            {/* Chimney Penetration Void */}
            <rect x="460" y="160" width="40" height="40" fill="#ec4899" fillOpacity="0.2" stroke="#ec4899" strokeWidth="1.5" />
            <text x="480" y="185" fill="#f472b6" fontSize="9" textAnchor="middle">VOID</text>
          </g>
        )}

        {/* ============================================================ */}
        {/* RENDER USER TAKEOFF MEASUREMENTS                             */}
        {/* ============================================================ */}
        {measurements.map(m => {
          const isSelected = m.id === selectedMeasurementId;
          const sz = scaleZones.find(z => z.id === m.scaleZoneId) || scaleZones[0];
          const mPxPerM = sz ? sz.pixelsPerMeter : 40;

          // 1. Line / Wall / Trench
          if (m.tool === 'line') {
            const isTrench = m.recipeType === 'trench';
            const trenchWidthM = (m.recipeConfig as any)?.centerLineWidth || 0.6;
            const trenchWidthPx = trenchWidthM * mPxPerM;
            const offsetPoly = isTrench ? expandCenterline(m.points, trenchWidthPx) : null;

            return (
              <g
                key={m.id}
                onClick={e => {
                  e.stopPropagation();
                  onSelectMeasurement(m.id);
                }}
                className="cursor-pointer"
              >
                {/* Centerline trench expansion polygon */}
                {isTrench && offsetPoly && (
                  <polygon
                    points={offsetPoly.map(p => `${p.x},${p.y}`).join(' ')}
                    fill={m.color}
                    fillOpacity={isSelected ? 0.45 : 0.25}
                    stroke={m.color}
                    strokeWidth="1.5"
                    strokeDasharray="3 2"
                  />
                )}

                {/* Primary center line */}
                <polyline
                  points={m.points.map(p => `${p.x},${p.y}`).join(' ')}
                  fill="none"
                  stroke={isSelected ? '#ffffff' : m.color}
                  strokeWidth={isSelected ? 4.5 : 3}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Vertices */}
                {m.points.map((pt, idx) => (
                  <circle
                    key={idx}
                    cx={pt.x}
                    cy={pt.y}
                    r={isSelected ? 5.5 : 4}
                    fill={isSelected ? '#ffffff' : m.color}
                    stroke="#0f172a"
                    strokeWidth="1.5"
                    onMouseDown={e => {
                      if (activeTool === 'select') {
                        e.stopPropagation();
                        setDraggedVertex({ measurementId: m.id, pointIndex: idx });
                      }
                    }}
                  />
                ))}

                {/* Dimension callout label */}
                {m.points.length >= 2 && (
                  <text
                    x={(m.points[0].x + m.points[1].x) / 2}
                    y={(m.points[0].y + m.points[1].y) / 2 - 8}
                    fill="#ffffff"
                    fontSize="11"
                    fontFamily="monospace"
                    fontWeight="bold"
                    filter="drop-shadow(0px 1px 2px rgba(0,0,0,0.9))"
                  >
                    {formatDim(lineLengthMeters(m.points, mPxPerM))}m
                  </text>
                )}
              </g>
            );
          }

          // 2. Polygon / Rectangle / Void / Roof
          if (m.tool === 'polygon' || m.tool === 'rectangle' || m.tool === 'void') {
            const isVoid = m.isVoid || m.tool === 'void';
            const edges = getPolygonEdges(m.points, mPxPerM, m.edgeTags);
            const areaM2 = polygonAreaMeters(m.points, mPxPerM);

            return (
              <g
                key={m.id}
                onClick={e => {
                  e.stopPropagation();
                  onSelectMeasurement(m.id);
                }}
                className="cursor-pointer"
              >
                {/* Polygon body */}
                <polygon
                  points={m.points.map(p => `${p.x},${p.y}`).join(' ')}
                  fill={isVoid ? 'url(#void-hatch)' : m.color}
                  fillOpacity={isVoid ? 0.9 : isSelected ? 0.45 : 0.25}
                  stroke={isSelected ? '#ffffff' : m.color}
                  strokeWidth={isSelected ? 3 : 2}
                  strokeDasharray={isVoid ? '4 2' : 'none'}
                />

                {/* Roof Edge Tagging Badges & Clickable Edges */}
                {m.recipeType === 'roof' && (
                  <g id="roof-edge-tags">
                    {edges.map(edge => {
                      const midX = (edge.p1.x + edge.p2.x) / 2;
                      const midY = (edge.p1.y + edge.p2.y) / 2;
                      const hasTag = edge.tag !== 'none';
                      return (
                        <g
                          key={edge.index}
                          onClick={e => handleEdgeTagClick(m, edge.index, e)}
                          className="cursor-pointer group"
                        >
                          <line
                            x1={edge.p1.x}
                            y1={edge.p1.y}
                            x2={edge.p2.x}
                            y2={edge.p2.y}
                            stroke={
                              edge.tag === 'ridge'
                                ? '#f43f5e'
                                : edge.tag === 'valley'
                                ? '#06b6d4'
                                : edge.tag === 'eave'
                                ? '#10b981'
                                : edge.tag === 'hip'
                                ? '#a855f7'
                                : '#e2e8f0'
                            }
                            strokeWidth={hasTag ? 4 : 2}
                          />
                          <circle cx={midX} cy={midY} r="9" fill="#0f172a" stroke="#64748b" strokeWidth="1" />
                          <text
                            x={midX}
                            y={midY + 3.5}
                            fill="#ffffff"
                            fontSize="9"
                            fontFamily="monospace"
                            fontWeight="bold"
                            textAnchor="middle"
                          >
                            {edge.tag === 'none' ? '?' : edge.tag[0].toUpperCase()}
                          </text>
                        </g>
                      );
                    })}
                  </g>
                )}

                {/* Polygon Vertices */}
                {m.points.map((pt, idx) => (
                  <circle
                    key={idx}
                    cx={pt.x}
                    cy={pt.y}
                    r={isSelected ? 5.5 : 3.5}
                    fill={isSelected ? '#ffffff' : m.color}
                    stroke="#0f172a"
                    strokeWidth="1.5"
                    onMouseDown={e => {
                      if (activeTool === 'select') {
                        e.stopPropagation();
                        setDraggedVertex({ measurementId: m.id, pointIndex: idx });
                      }
                    }}
                  />
                ))}

                {/* Edge Length Labels along perimeter segments (Wireframe: 14.2m, 28.5m) */}
                {edges.map((edge, eIdx) => {
                  const midX = (edge.p1.x + edge.p2.x) / 2;
                  const midY = (edge.p1.y + edge.p2.y) / 2;
                  return (
                    <g key={`dim-${eIdx}`} pointerEvents="none">
                      <rect
                        x={midX - 18}
                        y={midY - 8}
                        width="36"
                        height="16"
                        rx="4"
                        fill="#333331"
                        fillOpacity="0.85"
                      />
                      <text
                        x={midX}
                        y={midY + 3.5}
                        fill="#ffffff"
                        fontSize="9"
                        fontFamily="monospace"
                        fontWeight="bold"
                        textAnchor="middle"
                      >
                        {formatDim(edge.lengthMeters)}m
                      </text>
                    </g>
                  );
                })}

                {/* Area Tag Label */}
                {m.points.length >= 3 && (
                  <text
                    x={m.points.reduce((sum, p) => sum + p.x, 0) / m.points.length}
                    y={m.points.reduce((sum, p) => sum + p.y, 0) / m.points.length}
                    fill="#ffffff"
                    fontSize="12"
                    fontFamily="monospace"
                    fontWeight="bold"
                    textAnchor="middle"
                    filter="drop-shadow(0px 1px 3px rgba(0,0,0,0.95))"
                  >
                    {isVoid ? `-${formatDim(areaM2)}m² [VOID]` : `${formatDim(areaM2)}m²`}
                  </text>
                )}
              </g>
            );
          }

          // 3. Count Items (Doors, Columns)
          if (m.tool === 'count') {
            return (
              <g
                key={m.id}
                onClick={e => {
                  e.stopPropagation();
                  onSelectMeasurement(m.id);
                }}
                className="cursor-pointer"
              >
                {m.points.map((pt, idx) => (
                  <g key={idx} transform={`translate(${pt.x}, ${pt.y})`}>
                    <circle r={isSelected ? 8 : 6.5} fill={m.color} stroke="#ffffff" strokeWidth="1.5" />
                    <text
                      y="3.5"
                      fill="#ffffff"
                      fontSize="9"
                      fontFamily="monospace"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      {idx + 1}
                    </text>
                  </g>
                ))}
              </g>
            );
          }

          return null;
        })}

        {/* ============================================================ */}
        {/* ACTIVE DRAWING RUBBERBAND PREVIEW                            */}
        {/* ============================================================ */}
        {isDrawing && currentPoints.length > 0 && (
          <g id="active-rubberband" className="pointer-events-none">
            {/* Drawn segments */}
            {activeTool === 'line' && (
              <polyline
                points={[...currentPoints, isMagnetEnabled && snapInfo.snapped ? snappedPos : cursorCanvasPos]
                  .map(p => `${p.x},${p.y}`)
                  .join(' ')}
                fill="none"
                stroke="#38bdf8"
                strokeWidth="2.5"
                strokeDasharray="4 2"
              />
            )}

            {(activeTool === 'polygon' || activeTool === 'void') && (
              <polygon
                points={[...currentPoints, isMagnetEnabled && snapInfo.snapped ? snappedPos : cursorCanvasPos]
                  .map(p => `${p.x},${p.y}`)
                  .join(' ')}
                fill="#38bdf8"
                fillOpacity="0.2"
                stroke="#38bdf8"
                strokeWidth="2"
                strokeDasharray="4 2"
              />
            )}

            {/* Current point markers */}
            {currentPoints.map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y} r="4" fill="#38bdf8" stroke="#ffffff" strokeWidth="1.5" />
            ))}

            {/* Hover on first point hint to close polygon */}
            {currentPoints.length >= 3 && (
              <circle
                cx={currentPoints[0].x}
                cy={currentPoints[0].y}
                r="9"
                fill="none"
                stroke="#10b981"
                strokeWidth="2"
                className="animate-ping"
              />
            )}
          </g>
        )}

        {/* Active Scale Calibration 2-Point Guide and Rubberband */}
        {activeTool === 'calibrate' && calibrationPoints.length === 1 && (
          <g id="active-calibration-rubberband" className="pointer-events-none">
            {/* Pulsing Target Pin for Point 1 */}
            <circle
              cx={calibrationPoints[0].x}
              cy={calibrationPoints[0].y}
              r="12"
              fill="#10b981"
              fillOpacity="0.25"
              stroke="#059669"
              strokeWidth="2"
              className="animate-ping"
            />
            <circle
              cx={calibrationPoints[0].x}
              cy={calibrationPoints[0].y}
              r="5"
              fill="#059669"
              stroke="#ffffff"
              strokeWidth="2"
            />
            <text
              x={calibrationPoints[0].x + 10}
              y={calibrationPoints[0].y - 10}
              fill="#065f46"
              fontSize="11"
              fontWeight="bold"
              fontFamily="sans-serif"
            >
              Point 1 (Start)
            </text>

            {/* Connecting Dashed Dimension Line to Cursor */}
            <line
              x1={calibrationPoints[0].x}
              y1={calibrationPoints[0].y}
              x2={isMagnetEnabled && snapInfo.snapped ? snappedPos.x : cursorCanvasPos.x}
              y2={isMagnetEnabled && snapInfo.snapped ? snappedPos.y : cursorCanvasPos.y}
              stroke="#059669"
              strokeWidth="2.5"
              strokeDasharray="6 3"
            />

            {/* Point 2 Cursor Crosshair Target */}
            <circle
              cx={isMagnetEnabled && snapInfo.snapped ? snappedPos.x : cursorCanvasPos.x}
              cy={isMagnetEnabled && snapInfo.snapped ? snappedPos.y : cursorCanvasPos.y}
              r="6"
              fill="#10b981"
              fillOpacity="0.3"
              stroke="#059669"
              strokeWidth="2"
            />
            <circle
              cx={isMagnetEnabled && snapInfo.snapped ? snappedPos.x : cursorCanvasPos.x}
              cy={isMagnetEnabled && snapInfo.snapped ? snappedPos.y : cursorCanvasPos.y}
              r="2"
              fill="#059669"
            />
          </g>
        )}

        {/* Vector Magnet Snapping Indicator Ring */}
        {isMagnetEnabled && snapInfo.snapped && (
          <g className="pointer-events-none">
            <circle
              cx={snappedPos.x}
              cy={snappedPos.y}
              r="7"
              fill="none"
              stroke="#10b981"
              strokeWidth="2"
            />
            <circle cx={snappedPos.x} cy={snappedPos.y} r="2" fill="#10b981" />
            {snapInfo.type && (
              <text
                x={snappedPos.x + 10}
                y={snappedPos.y - 10}
                fill="#10b981"
                fontSize="10"
                fontFamily="monospace"
                fontWeight="bold"
              >
                {snapInfo.type === 'vertex'
                  ? 'MAGNET: VERTEX'
                  : snapInfo.type === 'ortho_h'
                  ? 'ORTHO: 0°/180°'
                  : snapInfo.type === 'ortho_v'
                  ? 'ORTHO: 90°'
                  : 'ORTHO: 45°'}
              </text>
            )}
          </g>
        )}
      </svg>

      {/* Floating Live Dimension & Tool Hint Badge at Cursor (Wireframe Hint Popup) */}
      {isDrawing && (
        <div
          className="absolute z-40 pointer-events-none bg-white/95 backdrop-blur-md border border-slate-300 rounded-xl shadow-xl px-3 py-2 text-xs flex flex-col gap-0.5 animate-in fade-in"
          style={{
            left: mousePos.x + 18,
            top: mousePos.y - 48
          }}
        >
          <div className="flex items-center gap-1.5 font-bold text-slate-800">
            <span className="w-2 h-2 rounded-full bg-[#00796B]" />
            <span>Active Tool: {activeTool.toUpperCase()}</span>
          </div>
          {liveMeasureLabel && (
            <div className="font-mono text-[11px] font-bold text-[#8E24AA]">
              {liveMeasureLabel}
            </div>
          )}
          <span className="text-[10px] text-slate-500">
            Click to place vertex • Double-click to close
          </span>
        </div>
      )}

      {/* Floating Live Dimension Badge at Cursor for Calibration */}
      {activeTool === 'calibrate' && calibrationPoints.length === 1 && (
        <div
          className="absolute z-40 pointer-events-none bg-emerald-700 text-white border border-emerald-500 px-3 py-1 rounded-lg shadow-lg text-xs font-mono font-bold flex items-center gap-1.5"
          style={{
            left: mousePos.x + 16,
            top: mousePos.y - 32
          }}
        >
          <Ruler className="w-3.5 h-3.5" />
          <span>
            {distancePixels(
              calibrationPoints[0],
              isMagnetEnabled && snapInfo.snapped ? snappedPos : cursorCanvasPos
            ).toFixed(1)}{' '}
            px
          </span>
        </div>
      )}

      {/* Top Banner when in Calibration Mode */}
      {activeTool === 'calibrate' && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-30 bg-white/95 backdrop-blur-md border-2 border-emerald-600 rounded-2xl px-5 py-2.5 shadow-xl flex items-center gap-4 animate-in fade-in slide-in-from-top-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
            <Ruler className="w-5 h-5" />
          </div>
          <div className="text-left">
            <span className="text-xs font-bold text-slate-900 block">
              {calibrationPoints.length === 0
                ? 'Step 1: Click the START of a known dimension line or wall'
                : 'Step 2: Click the END of the dimension line to calibrate'}
            </span>
            <span className="text-[11px] text-slate-500 block">
              {calibrationPoints.length === 0
                ? 'Reference any line of known length on the plan (e.g. 5.0m exterior wall)'
                : `Current distance: ${distancePixels(
                    calibrationPoints[0],
                    isMagnetEnabled && snapInfo.snapped ? snappedPos : cursorCanvasPos
                  ).toFixed(1)} px`}
            </span>
          </div>
          <button
            onClick={() => {
              setCalibrationPoints([]);
              onCancelCalibrate?.();
            }}
            className="ml-2 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
          >
            Cancel
          </button>
        </div>
      )}

      {/* 2X MAGNIFIER GLASS LOUPE FOR RASTER SCAN PRECISION */}
      {isMagnifierEnabled && (
        <div
          className="absolute z-40 pointer-events-none rounded-full border-2 border-blue-500 shadow-2xl overflow-hidden bg-white"
          style={{
            width: 140,
            height: 140,
            left: mousePos.x + 20,
            top: mousePos.y - 150
          }}
        >
          {/* Internal zoomed mini-canvas preview */}
          <div
            className="w-[700px] h-[500px] origin-top-left absolute"
            style={{
              transform: `scale(2.2) translate(${-cursorCanvasPos.x + 32}px, ${-cursorCanvasPos.y + 32}px)`
            }}
          >
            {/* Crosshair inside loupe */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-8 h-[1px] bg-blue-600 opacity-80" />
              <div className="h-8 w-[1px] bg-blue-600 opacity-80" />
            </div>
          </div>
          {/* Crosshair Overlay in center of loupe */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-10 h-[1px] bg-blue-600" />
            <div className="h-10 w-[1px] bg-blue-600" />
            <div className="w-4 h-4 rounded-full border border-blue-600/60" />
          </div>
          <div className="absolute bottom-1 right-2 text-[9px] font-mono text-blue-700 font-bold bg-white/90 border border-blue-200 px-1.5 rounded">
            2.2x LOUPE
          </div>
        </div>
      )}

      {/* Bottom Floating Scroll & Navigation Controls for non-technical users */}
      <div className="hidden md:flex absolute bottom-3 left-3 z-30 items-center gap-2">
        {/* Directional Scroll Controller */}
        <div className="flex items-center gap-1 bg-white/95 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-slate-200 shadow-sm text-slate-700">
          <span className="text-xs font-semibold text-slate-600 px-1">Scroll Plan:</span>
          <button
            onClick={handleScrollUp}
            title="Scroll Plan Up"
            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleScrollDown}
            title="Scroll Plan Down"
            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleScrollLeft}
            title="Scroll Plan Left"
            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleScrollRight}
            title="Scroll Plan Right"
            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleResetZoom}
            title="Reset Plan to Center"
            className="px-2.5 py-1 ml-0.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-xs font-bold text-blue-700 border border-blue-200 transition"
          >
            Center
          </button>
        </div>

        {/* Friendly Instruction Strip */}
        <div className="hidden sm:flex items-center gap-2 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-700 shadow-sm font-medium">
          <HelpCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          {isDrawing ? (
            <span className="text-blue-700 font-bold">
              Click anywhere to add corners. Double-click when finished!
            </span>
          ) : activeTool === 'select' ? (
            <span className="text-slate-600">
              💡 Tip: Use your mouse wheel to scroll up & down. Drag plan to move around.
            </span>
          ) : (
            <span className="text-slate-600">
              Click on the plan to start measuring. Wheel scrolls up & down.
            </span>
          )}
        </div>
      </div>

      {/* Interactive In-App Calibration Confirmation Modal (Replaces blocked window.prompt) */}
      {pendingCalibration && (
        <div
          id="calibration-dialog-backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in"
        >
          <div
            id="calibration-dialog-content"
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                  <Ruler className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Set Scale from Measured Line
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Enter the known real-world length of this measured line
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setPendingCalibration(null);
                  setCalibrationPoints([]);
                }}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Measured Pixels Info */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between">
              <span className="text-xs text-slate-600 font-medium">
                Measured on Plan:
              </span>
              <span className="text-sm font-mono font-bold text-slate-900">
                {pendingCalibration.pixelDistance.toFixed(1)} pixels
              </span>
            </div>

            {/* Real Distance Input */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Known Real-World Length (in meters):
              </label>
              <div className="flex items-center">
                <input
                  type="number"
                  step="0.01"
                  min="0.05"
                  autoFocus
                  value={calibrationInputMeters}
                  onChange={e => setCalibrationInputMeters(e.target.value)}
                  placeholder="5.0"
                  className="w-full bg-white border border-slate-300 rounded-l-xl px-3 py-2 text-sm font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs"
                />
                <span className="px-3.5 py-2 bg-slate-100 border border-l-0 border-slate-300 rounded-r-xl text-xs font-bold text-slate-600">
                  meters (m)
                </span>
              </div>

              {/* Quick Length Preset Chips */}
              <div className="flex items-center gap-1.5 flex-wrap mt-2">
                {['1.0', '2.0', '2.4', '3.0', '5.0', '6.0', '10.0'].map(val => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setCalibrationInputMeters(val)}
                    className={`px-2.5 py-1 text-xs rounded-lg font-mono font-semibold transition ${
                      calibrationInputMeters === val
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    {val}m
                  </button>
                ))}
              </div>
            </div>

            {/* Live Computed Calibration Preview */}
            {(() => {
              const meters = parseFloat(calibrationInputMeters);
              if (isNaN(meters) || meters <= 0) return null;
              const pxPerM = Math.round((pendingCalibration.pixelDistance / meters) * 10) / 10;
              const approxRatio = `1:${Math.round(4000 / pxPerM)}`;
              return (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-900 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-emerald-700">Calculated Screen Scale:</span>
                    <span className="font-mono font-bold text-emerald-900">{pxPerM} px / meter</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-emerald-700">Estimated Architectural Scale:</span>
                    <span className="font-mono font-bold text-emerald-900">~{approxRatio}</span>
                  </div>
                </div>
              );
            })()}

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setPendingCalibration(null);
                  setCalibrationPoints([]);
                }}
                className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const meters = parseFloat(calibrationInputMeters);
                  if (!isNaN(meters) && meters > 0 && onCalibrateZone) {
                    const pxPerM = Math.round((pendingCalibration.pixelDistance / meters) * 10) / 10;
                    const approxRatio = `1:${Math.round(4000 / pxPerM)}`;
                    onCalibrateZone(pendingCalibration.zoneId, pendingCalibration.pixelDistance, meters, approxRatio);
                  }
                  setPendingCalibration(null);
                  setCalibrationPoints([]);
                }}
                className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition"
              >
                Save & Apply Scale
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
