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
  CheckCircle2
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
  onCalibrateZone?: (zoneId: string, measuredPx: number, realMeters: number) => void;
  isMagnetEnabled: boolean;
  isMagnifierEnabled: boolean;
  onToggleMagnet: () => void;
  onToggleMagnifier: () => void;
  isSideBySideView?: boolean;
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
  isMagnetEnabled,
  isMagnifierEnabled,
  onToggleMagnet,
  onToggleMagnifier,
  isSideBySideView = false
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

    // Calibration tool
    if (activeTool === 'calibrate') {
      const newCal = [...calibrationPoints, clickPoint];
      setCalibrationPoints(newCal);
      if (newCal.length === 2) {
        const pxDist = distancePixels(newCal[0], newCal[1]);
        const enteredMeters = window.prompt(
          `Measured distance is ${pxDist.toFixed(1)} pixels.\nEnter known length in meters (e.g. 5.0):`,
          '5.0'
        );
        if (enteredMeters && !isNaN(Number(enteredMeters))) {
          const meters = parseFloat(enteredMeters);
          const activeZone = getActiveScaleZone(newCal[0], scaleZones);
          if (onCalibrateZone && meters > 0) {
            onCalibrateZone(activeZone.id, pxDist, meters);
          }
        }
        setCalibrationPoints([]);
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
        if (currentPoints.length >= 3 && distancePixels(clickPoint, currentPoints[0]) < 20 / zoom) {
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

  // Zoom with wheel
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.min(Math.max(zoom * delta, 0.2), 6);

    // Zoom towards mouse position
    const newPanX = mouseX - (mouseX - pan.x) * (newZoom / zoom);
    const newPanY = mouseY - (mouseY - pan.y) * (newZoom / zoom);

    setZoom(newZoom);
    setPan({ x: newPanX, y: newPanY });
  };

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
      className="relative w-full h-full select-none overflow-hidden bg-slate-950 font-sans"
      onMouseMove={handleMouseMove}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onDoubleClick={handleDoubleClick}
      onWheel={handleWheel}
      style={{ cursor: isPanning ? 'grabbing' : activeTool === 'select' ? 'default' : 'crosshair' }}
    >
      {/* Top HUD Controls */}
      <div className="absolute top-3 left-3 z-30 flex items-center gap-2 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-700/70 shadow-lg text-xs text-slate-200">
        <div className="flex items-center gap-1.5 font-medium text-amber-400">
          <Layers className="w-4 h-4" />
          <span>{sheet.title}</span>
        </div>
        <span className="text-slate-500">•</span>
        <div className="flex items-center gap-1">
          <span className="px-1.5 py-0.5 rounded bg-blue-900/60 border border-blue-700/60 text-blue-300 font-mono">
            {activeRevision}
          </span>
          {sheet.hasRevisions && (
            <span className="text-slate-400 text-[11px]">
              {activeRevision === 'RevA' ? sheet.revALabel : sheet.revBLabel}
            </span>
          )}
        </div>
        <span className="text-slate-500">•</span>
        <div className="flex items-center gap-1 text-emerald-400 font-mono">
          <Compass className="w-3.5 h-3.5" />
          <span>Scale: {activeScale?.ratio} ({activeScale?.pixelsPerMeter} px/m)</span>
        </div>
      </div>

      {/* Top Right Tool Bar Overlay */}
      <div className="absolute top-3 right-3 z-30 flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-md p-1 rounded-lg border border-slate-700/70 shadow-lg">
        {/* Magnet Snapping Toggle */}
        <button
          onClick={onToggleMagnet}
          title="Vector Magnet Snapping (snaps to vertices, midpoints, orthogonal lines)"
          className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition ${
            isMagnetEnabled
              ? 'bg-emerald-600 text-white shadow-sm font-semibold'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Magnet</span>
        </button>

        {/* 2x Magnifier Glass Loupe Toggle */}
        <button
          onClick={onToggleMagnifier}
          title="2x Precision Loupe Magnifier for raster scans"
          className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition ${
            isMagnifierEnabled
              ? 'bg-amber-600 text-white shadow-sm font-semibold'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Crosshair className="w-3.5 h-3.5" />
          <span>2x Loupe</span>
        </button>

        <div className="h-4 w-[1px] bg-slate-700 mx-1" />

        {/* Zoom Controls */}
        <button
          onClick={() => setZoom(z => Math.min(z * 1.25, 6))}
          title="Zoom In"
          className="p-1 rounded text-slate-300 hover:text-white hover:bg-slate-800"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        <span className="text-[11px] font-mono text-slate-400 px-1">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={() => setZoom(z => Math.max(z * 0.8, 0.2))}
          title="Zoom Out"
          className="p-1 rounded text-slate-300 hover:text-white hover:bg-slate-800"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleResetZoom}
          title="Reset Zoom (100%)"
          className="p-1 rounded text-slate-300 hover:text-white hover:bg-slate-800"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
      </div>

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
            <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#1e293b" strokeWidth="0.5" />
          </pattern>
          <pattern id="grid-major" width="50" height="50" patternUnits="userSpaceOnUse">
            <rect width="50" height="50" fill="url(#grid-small)" />
            <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#334155" strokeWidth="1" />
          </pattern>
          {/* Void Hatch pattern */}
          <pattern id="void-hatch" width="8" height="8" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
            <line x1="0" y1="0" x2="0" y2="8" stroke="#ec4899" strokeWidth="2" strokeOpacity="0.4" />
          </pattern>
        </defs>

        {/* Blueprint Canvas Background */}
        <rect x="0" y="0" width="1100" height="750" fill="#0f172a" />
        <rect x="0" y="0" width="1100" height="750" fill="url(#grid-major)" opacity="0.75" />

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
                stroke={isMain ? '#38bdf8' : '#eab308'}
                strokeWidth="1.5"
                strokeDasharray={isMain ? '6 4' : '4 3'}
                opacity="0.5"
              />
              <rect
                x={x + 5}
                y={y + 5}
                width="135"
                height="22"
                fill="#0f172a"
                rx="4"
                opacity="0.8"
              />
              <text
                x={x + 12}
                y={y + 20}
                fill={isMain ? '#38bdf8' : '#eab308'}
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
                    stroke="#94a3b8"
                    strokeWidth="8"
                    strokeLinejoin="round"
                  />
                  <path
                    d={`M 120 140 L ${bedExtX} 140 L ${bedExtX} 380 L 420 380 L 420 560 L 120 560 Z`}
                    fill="none"
                    stroke="#0284c7"
                    strokeWidth="2"
                    strokeLinejoin="round"
                  />

                  {/* Internal Partition Walls */}
                  <line x1="420" y1="140" x2="420" y2="380" stroke="#94a3b8" strokeWidth="6" />
                  <line x1="120" y1="380" x2="420" y2="380" stroke="#94a3b8" strokeWidth="6" />
                  <line x1="260" y1="380" x2="260" y2="560" stroke="#94a3b8" strokeWidth="6" />

                  {/* Revision B Delta indicator callout */}
                  {activeRevision === 'RevB' && (
                    <g className="animate-pulse">
                      <rect x="670" y="130" width="60" height="260" fill="#f59e0b" fillOpacity="0.15" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="4 2" />
                      <text x="685" y="270" fill="#fbbf24" fontSize="11" fontWeight="bold" fontFamily="monospace">
                        REV B EXTENSION (+1.2m)
                      </text>
                    </g>
                  )}

                  {/* Doors (Method 2 Door Deduction visual cue) */}
                  {/* Balcony Door */}
                  <path d="M 420 220 A 36 36 0 0 1 456 256" fill="none" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="3 2" />
                  <line x1="420" y1="220" x2="420" y2="256" stroke="#f59e0b" strokeWidth="2.5" />

                  {/* Room Entry Door */}
                  <path d="M 120 240 A 36 36 0 0 0 156 204" fill="none" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="3 2" />
                  <line x1="120" y1="240" x2="120" y2="204" stroke="#f59e0b" strokeWidth="2.5" />

                  {/* Master Bedroom Door */}
                  <path d="M 420 300 A 36 36 0 0 1 456 336" fill="none" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="3 2" />
                  <line x1="420" y1="300" x2="420" y2="336" stroke="#f59e0b" strokeWidth="2.5" />

                  {/* Windows */}
                  <line x1="200" y1="140" x2="340" y2="140" stroke="#38bdf8" strokeWidth="4" />
                  <line x1="500" y1="140" x2="620" y2="140" stroke="#38bdf8" strokeWidth="4" />
                  <line x1="120" y1="440" x2="120" y2="520" stroke="#38bdf8" strokeWidth="4" />

                  {/* Staircase Void Opening in Living Room */}
                  <rect x="160" y="280" width="100" height="60" fill="#ec4899" fillOpacity="0.1" stroke="#ec4899" strokeWidth="1.5" strokeDasharray="4 2" />
                  <line x1="160" y1="280" x2="260" y2="340" stroke="#ec4899" strokeWidth="1" strokeOpacity="0.5" />
                  <line x1="160" y1="340" x2="260" y2="280" stroke="#ec4899" strokeWidth="1" strokeOpacity="0.5" />
                  <text x="175" y="315" fill="#f472b6" fontSize="10" fontFamily="sans-serif" fontWeight="bold">
                    VOID OPENING
                  </text>

                  {/* Room Labels */}
                  <text x="240" y="220" fill="#93c5fd" fontSize="14" fontWeight="bold" textAnchor="middle">
                    LIVING & DINING
                  </text>
                  <text x="240" y="238" fill="#64748b" fontSize="11" textAnchor="middle">
                    Area ~45.0m² • Clg Ht: 2.80m
                  </text>

                  <text x={activeRevision === 'RevB' ? '575' : '550'} y="230" fill="#5eead4" fontSize="14" fontWeight="bold" textAnchor="middle">
                    MASTER BEDROOM
                  </text>
                  <text x={activeRevision === 'RevB' ? '575' : '550'} y="248" fill="#64748b" fontSize="11" textAnchor="middle">
                    {activeRevision === 'RevB' ? 'Area ~32.8m² (Extended)' : 'Area ~26.4m²'}
                  </text>

                  <text x="190" y="470" fill="#cbd5e1" fontSize="13" fontWeight="bold" textAnchor="middle">
                    KITCHEN
                  </text>
                  <text x="340" y="470" fill="#cbd5e1" fontSize="13" fontWeight="bold" textAnchor="middle">
                    BEDROOM 2
                  </text>

                  {/* Dimension Strings (40px = 1.0m) */}
                  {/* Top dimension: 120 to 420 is 300px = 7.50m */}
                  <g stroke="#64748b" strokeWidth="1" fontSize="10" fill="#94a3b8" fontFamily="monospace">
                    <line x1="120" y1="100" x2="420" y2="100" />
                    <line x1="120" y1="92" x2="120" y2="108" />
                    <line x1="420" y1="92" x2="420" y2="108" />
                    <text x="270" y="95" textAnchor="middle">7.50 m</text>

                    {/* Right dimension for Bed */}
                    <line x1="420" y1="100" x2={bedExtX} y2="100" />
                    <line x1={bedExtX} y1="92" x2={bedExtX} y2="108" />
                    <text x={(420 + bedExtX) / 2} y="95" textAnchor="middle">
                      {activeRevision === 'RevB' ? '7.70 m' : '6.50 m'}
                    </text>

                    {/* Left vertical dimension: 140 to 380 is 240px = 6.00m */}
                    <line x1="80" y1="140" x2="80" y2="380" />
                    <line x1="72" y1="140" x2="88" y2="140" />
                    <line x1="72" y1="380" x2="88" y2="380" />
                    <text x="70" y="265" textAnchor="end" transform="rotate(-90 70 265)">6.00 m</text>
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

      {/* Floating Live Dimension Badge at Cursor */}
      {isDrawing && liveMeasureLabel && (
        <div
          className="absolute z-40 pointer-events-none bg-slate-900/95 border border-sky-500/80 px-2 py-1 rounded shadow-lg text-[11px] font-mono font-bold text-sky-300"
          style={{
            left: mousePos.x + 16,
            top: mousePos.y - 28
          }}
        >
          {liveMeasureLabel}
        </div>
      )}

      {/* 2X MAGNIFIER GLASS LOUPE FOR RASTER SCAN PRECISION */}
      {isMagnifierEnabled && (
        <div
          className="absolute z-40 pointer-events-none rounded-full border-2 border-amber-400 shadow-2xl overflow-hidden bg-slate-900"
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
              <div className="w-8 h-[1px] bg-amber-400 opacity-80" />
              <div className="h-8 w-[1px] bg-amber-400 opacity-80" />
            </div>
          </div>
          {/* Crosshair Overlay in center of loupe */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-10 h-[1px] bg-amber-400" />
            <div className="h-10 w-[1px] bg-amber-400" />
            <div className="w-4 h-4 rounded-full border border-amber-400/60" />
          </div>
          <div className="absolute bottom-1 right-2 text-[9px] font-mono text-amber-300 bg-slate-950/80 px-1 rounded">
            2.2x LOUPE
          </div>
        </div>
      )}

      {/* Bottom Floating Drawing Instruction Strip */}
      <div className="absolute bottom-2 left-3 z-30 flex items-center gap-2 bg-slate-900/90 backdrop-blur-md px-3 py-1 rounded-md border border-slate-700 text-xs text-slate-300">
        <span className="text-slate-400">Tool:</span>
        <span className="font-semibold text-amber-400 uppercase">{activeTool}</span>
        <span className="text-slate-500">|</span>
        {isDrawing ? (
          <span className="text-sky-300">
            Click to add points • Double-click or click start point to finish measurement
          </span>
        ) : activeTool === 'select' ? (
          <span className="text-slate-400">Click a measurement to inspect or drag vertices</span>
        ) : (
          <span className="text-slate-400">Click on canvas to begin drawing</span>
        )}
      </div>
    </div>
  );
};
