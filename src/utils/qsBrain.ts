import {
  MeasurementItem,
  CalculatedRow,
  FolderNode,
  ScaleZone,
  WallRecipeConfig,
  TrenchRecipeConfig,
  RoofRecipeConfig,
  CeilingRecipeConfig,
  FloorRecipeConfig,
  CountRecipeConfig,
  EdgeTag
} from '../types/takeoff';
import {
  lineLengthMeters,
  polygonAreaMeters,
  polygonPerimeterMeters,
  isPolygonInsidePolygon,
  getRoofPitchFactor,
  getPolygonEdges,
  formatDim
} from './geometry';

/**
 * Calculates all row items for the measurement sheet according to the QS Brain rules
 */
export function calculateMeasurementRows(
  measurements: MeasurementItem[],
  folders: FolderNode[],
  scaleZones: ScaleZone[]
): CalculatedRow[] {
  const rows: CalculatedRow[] = [];
  const folderMap = new Map<string, FolderNode>();
  for (const f of folders) {
    folderMap.set(f.id, f);
  }

  const scaleMap = new Map<string, ScaleZone>();
  for (const sz of scaleZones) {
    scaleMap.set(sz.id, sz);
  }

  // Pre-calculate Door Counts and Dimensions per folder for Method 2 Door Deductions
  const folderDoorStats = new Map<string, { count: number; totalWidth: number; items: string[] }>();

  for (const m of measurements) {
    if (m.recipeType === 'count') {
      const cfg = m.recipeConfig as CountRecipeConfig;
      const isDoor =
        cfg?.itemType?.toLowerCase().includes('door') ||
        m.name.toLowerCase().includes('door');

      if (isDoor) {
        const count = m.points.length;
        const doorWidth = cfg?.width || 0.9; // Standard 900mm default
        const current = folderDoorStats.get(m.folderId) || { count: 0, totalWidth: 0, items: [] };
        current.count += count;
        current.totalWidth += count * doorWidth;
        current.items.push(`${count}x ${m.name} (${doorWidth}m)`);
        folderDoorStats.set(m.folderId, current);
      }
    }
  }

  // Pre-calculate Auto-Voids for polygons
  // Identify all polygons that are marked as void or contained within other polygons
  const polygonMeasurements = measurements.filter(
    m => m.tool === 'polygon' || m.tool === 'rectangle' || m.tool === 'void'
  );

  const voidDeductionsMap = new Map<
    string,
    { totalVoidAreaM2: number; voidCount: number; voidNames: string[] }
  >();

  for (const parent of polygonMeasurements) {
    if (parent.isVoid || parent.tool === 'void') continue;

    const parentScale = scaleMap.get(parent.scaleZoneId) || scaleZones[0];
    const parentPxPerM = parentScale ? parentScale.pixelsPerMeter : 50;

    let totalVoidArea = 0;
    let count = 0;
    const voidNames: string[] = [];

    for (const child of polygonMeasurements) {
      if (child.id === parent.id) continue;

      // Check if child is marked as void or is explicitly inside parent
      const isExplicitVoid = child.isVoid || child.tool === 'void';
      const isContained = isPolygonInsidePolygon(child.points, parent.points);

      if (isContained && (isExplicitVoid || child.folderId === parent.folderId)) {
        const childScale = scaleMap.get(child.scaleZoneId) || parentScale;
        const childArea = polygonAreaMeters(child.points, childScale.pixelsPerMeter);
        totalVoidArea += childArea;
        count++;
        voidNames.push(`${child.name} (${formatDim(childArea)}m²)`);
      }
    }

    if (count > 0) {
      voidDeductionsMap.set(parent.id, {
        totalVoidAreaM2: totalVoidArea,
        voidCount: count,
        voidNames
      });
    }
  }

  // Generate Calculated Rows for each measurement
  for (const m of measurements) {
    // Skip independent voids from generating positive rows
    if (m.isVoid || m.tool === 'void') continue;

    const folder = folderMap.get(m.folderId);
    const folderName = folder ? folder.name : 'General';
    const folderMultiplier = folder ? folder.multiplier : 1;
    const effectiveMultiplier = m.isUnlinkedMultiplier ? 1 : folderMultiplier;

    const scale = scaleMap.get(m.scaleZoneId) || scaleZones[0];
    const pxPerM = scale ? scale.pixelsPerMeter : 50;

    switch (m.recipeType) {
      // ----------------------------------------------------
      // A. SUBSTRUCTURE & WALLS
      // ----------------------------------------------------
      case 'wall': {
        const cfg = m.recipeConfig as WallRecipeConfig;
        const length = lineLengthMeters(m.points, pxPerM);
        const height = cfg.height ?? 2.8;
        const thickness = cfg.thickness ?? 0.23;

        // 1. Linear Length
        if (cfg.outputLinear ?? true) {
          rows.push({
            id: `${m.id}_wall_len`,
            measurementId: m.id,
            measurementUid: m.uid,
            itemName: `${m.name} - Linear Length`,
            folderId: m.folderId,
            folderName,
            folderMultiplier,
            trade: 'Superstructure / Walls',
            grossQty: length,
            deductions: 0,
            deductionNotes: 'None',
            netTotal: length,
            factoredTotal: length * effectiveMultiplier,
            unit: 'm',
            formula: `${formatDim(length)}m (Measured 2D length)`,
            unitRate: 15.0,
            totalCost: length * effectiveMultiplier * 15.0,
            isUnlinked: m.isUnlinkedMultiplier,
            revision: m.revision,
            color: m.color
          });
        }

        // 2. Vertical Wall Area (Length * Height)
        if (cfg.outputArea ?? true) {
          const grossArea = length * height;
          // Check for door/window deductions in this folder
          const doorInfo = folderDoorStats.get(m.folderId);
          // Vertical wall door opening deduction: standard height ~2.1m * width
          let deduction = 0;
          let deductionStr = 'None';
          if (doorInfo && doorInfo.count > 0) {
            deduction = doorInfo.count * (doorInfo.totalWidth / doorInfo.count) * 2.1;
            deductionStr = `Less ${doorInfo.count}x Door Openings (${formatDim(deduction)}m²)`;
          }
          const netArea = Math.max(0, grossArea - deduction);

          rows.push({
            id: `${m.id}_wall_area`,
            measurementId: m.id,
            measurementUid: m.uid,
            itemName: `${m.name} - Vertical Wall Area`,
            folderId: m.folderId,
            folderName,
            folderMultiplier,
            trade: 'Superstructure / Walls',
            grossQty: grossArea,
            deductions: deduction,
            deductionNotes: deductionStr,
            netTotal: netArea,
            factoredTotal: netArea * effectiveMultiplier,
            unit: 'm²',
            formula:
              deduction > 0
                ? `${formatDim(length)}m * ${formatDim(height)}m (H) - ${formatDim(deduction)}m² (Doors) = ${formatDim(netArea)}m²`
                : `${formatDim(length)}m * ${formatDim(height)}m (H) = ${formatDim(netArea)}m²`,
            unitRate: 48.5,
            totalCost: netArea * effectiveMultiplier * 48.5,
            isUnlinked: m.isUnlinkedMultiplier,
            revision: m.revision,
            color: m.color
          });
        }

        // 3. Wall Volume (Length * Height * Thickness)
        if (cfg.outputVolume ?? true) {
          const grossVol = length * height * thickness;
          rows.push({
            id: `${m.id}_wall_vol`,
            measurementId: m.id,
            measurementUid: m.uid,
            itemName: `${m.name} - Brickwork / Concrete Volume`,
            folderId: m.folderId,
            folderName,
            folderMultiplier,
            trade: 'Superstructure / Walls',
            grossQty: grossVol,
            deductions: 0,
            deductionNotes: 'None',
            netTotal: grossVol,
            factoredTotal: grossVol * effectiveMultiplier,
            unit: 'm³',
            formula: `${formatDim(length)}m * ${formatDim(height)}m (H) * ${formatDim(thickness)}m (Thk) = ${formatDim(grossVol)}m³`,
            unitRate: 185.0,
            totalCost: grossVol * effectiveMultiplier * 185.0,
            isUnlinked: m.isUnlinkedMultiplier,
            revision: m.revision,
            color: m.color
          });
        }

        // 4. Formwork (Optional)
        if (cfg.outputFormwork) {
          const formworkArea = 2 * length * height;
          rows.push({
            id: `${m.id}_wall_formwork`,
            measurementId: m.id,
            measurementUid: m.uid,
            itemName: `${m.name} - Wall Formwork (2 faces)`,
            folderId: m.folderId,
            folderName,
            folderMultiplier,
            trade: 'Superstructure / Walls',
            grossQty: formworkArea,
            deductions: 0,
            deductionNotes: 'None',
            netTotal: formworkArea,
            factoredTotal: formworkArea * effectiveMultiplier,
            unit: 'm²',
            formula: `2 * ${formatDim(length)}m * ${formatDim(height)}m = ${formatDim(formworkArea)}m²`,
            unitRate: 32.0,
            totalCost: formworkArea * effectiveMultiplier * 32.0,
            isUnlinked: m.isUnlinkedMultiplier,
            revision: m.revision,
            color: m.color
          });
        }
        break;
      }

      // ----------------------------------------------------
      // A2. TRENCH EXCAVATION (Center-line Tool)
      // ----------------------------------------------------
      case 'trench': {
        const cfg = m.recipeConfig as TrenchRecipeConfig;
        const length = lineLengthMeters(m.points, pxPerM);
        const width = cfg.centerLineWidth ?? 0.6; // e.g. 600mm
        const depth = cfg.depth ?? 0.85;

        // 1. Centerline length
        if (cfg.outputCenterline ?? true) {
          rows.push({
            id: `${m.id}_trench_cl`,
            measurementId: m.id,
            measurementUid: m.uid,
            itemName: `${m.name} - Trench Centerline Length`,
            folderId: m.folderId,
            folderName,
            folderMultiplier,
            trade: 'Substructure / Excavation',
            grossQty: length,
            deductions: 0,
            deductionNotes: 'Center-line offset applied',
            netTotal: length,
            factoredTotal: length * effectiveMultiplier,
            unit: 'm',
            formula: `${formatDim(length)}m center-line`,
            unitRate: 8.0,
            totalCost: length * effectiveMultiplier * 8.0,
            isUnlinked: m.isUnlinkedMultiplier,
            revision: m.revision,
            color: m.color
          });
        }

        // 2. Trench Excavation Volume (Length * Width * Depth)
        if (cfg.outputVolume ?? true) {
          const vol = length * width * depth;
          rows.push({
            id: `${m.id}_trench_vol`,
            measurementId: m.id,
            measurementUid: m.uid,
            itemName: `${m.name} - Trench Excavation Volume`,
            folderId: m.folderId,
            folderName,
            folderMultiplier,
            trade: 'Substructure / Excavation',
            grossQty: vol,
            deductions: 0,
            deductionNotes: 'None',
            netTotal: vol,
            factoredTotal: vol * effectiveMultiplier,
            unit: 'm³',
            formula: `${formatDim(length)}m (L) * ${formatDim(width)}m (W) * ${formatDim(depth)}m (D) = ${formatDim(vol)}m³`,
            unitRate: 28.5,
            totalCost: vol * effectiveMultiplier * 28.5,
            isUnlinked: m.isUnlinkedMultiplier,
            revision: m.revision,
            color: m.color
          });
        }

        // 3. Trench Bedding / Foundation Bottom Area
        if (cfg.outputBeddingArea ?? true) {
          const area = length * width;
          rows.push({
            id: `${m.id}_trench_bedding`,
            measurementId: m.id,
            measurementUid: m.uid,
            itemName: `${m.name} - Foundation Trench Bedding Area`,
            folderId: m.folderId,
            folderName,
            folderMultiplier,
            trade: 'Substructure / Excavation',
            grossQty: area,
            deductions: 0,
            deductionNotes: 'None',
            netTotal: area,
            factoredTotal: area * effectiveMultiplier,
            unit: 'm²',
            formula: `${formatDim(length)}m * ${formatDim(width)}m = ${formatDim(area)}m²`,
            unitRate: 12.0,
            totalCost: area * effectiveMultiplier * 12.0,
            isUnlinked: m.isUnlinkedMultiplier,
            revision: m.revision,
            color: m.color
          });
        }

        // 4. Shoring / Earthwork support (2 * Length * Depth)
        if (cfg.outputShoring) {
          const shoring = 2 * length * depth;
          rows.push({
            id: `${m.id}_trench_shoring`,
            measurementId: m.id,
            measurementUid: m.uid,
            itemName: `${m.name} - Trench Earthwork Shoring`,
            folderId: m.folderId,
            folderName,
            folderMultiplier,
            trade: 'Substructure / Excavation',
            grossQty: shoring,
            deductions: 0,
            deductionNotes: 'None',
            netTotal: shoring,
            factoredTotal: shoring * effectiveMultiplier,
            unit: 'm²',
            formula: `2 * ${formatDim(length)}m * ${formatDim(depth)}m = ${formatDim(shoring)}m²`,
            unitRate: 18.0,
            totalCost: shoring * effectiveMultiplier * 18.0,
            isUnlinked: m.isUnlinkedMultiplier,
            revision: m.revision,
            color: m.color
          });
        }
        break;
      }

      // ----------------------------------------------------
      // B. ROOFING (Slope & Pitch Logic, Edge Tagging)
      // ----------------------------------------------------
      case 'roof': {
        const cfg = m.recipeConfig as RoofRecipeConfig;
        const planArea = polygonAreaMeters(m.points, pxPerM);
        const pitch = cfg.pitchDegrees ?? 30;
        const { factor, cosVal } = getRoofPitchFactor(pitch);
        const slopedArea = planArea * factor;

        // 1. 2D Plan Area
        if (cfg.outputPlanArea) {
          rows.push({
            id: `${m.id}_roof_plan`,
            measurementId: m.id,
            measurementUid: m.uid,
            itemName: `${m.name} - Plan Roof Area (2D)`,
            folderId: m.folderId,
            folderName,
            folderMultiplier,
            trade: 'Roofing & Rainwater',
            grossQty: planArea,
            deductions: 0,
            deductionNotes: 'None',
            netTotal: planArea,
            factoredTotal: planArea * effectiveMultiplier,
            unit: 'm²',
            formula: `Plan Shoelace 2D Area: ${formatDim(planArea)}m²`,
            unitRate: 0,
            totalCost: 0,
            isUnlinked: m.isUnlinkedMultiplier,
            revision: m.revision,
            color: m.color
          });
        }

        // 2. True Sloped Roof Area (Plan Area / cos(Pitch))
        if (cfg.outputSlopedArea ?? true) {
          rows.push({
            id: `${m.id}_roof_sloped`,
            measurementId: m.id,
            measurementUid: m.uid,
            itemName: `${m.name} - True Sloped Roof Area (${pitch}°)`,
            folderId: m.folderId,
            folderName,
            folderMultiplier,
            trade: 'Roofing & Rainwater',
            grossQty: slopedArea,
            deductions: 0,
            deductionNotes: 'Pitch Conversion applied',
            netTotal: slopedArea,
            factoredTotal: slopedArea * effectiveMultiplier,
            unit: 'm²',
            formula: `${formatDim(planArea)}m² / cos(${pitch}°) [x${formatDim(factor, 4)}] = ${formatDim(slopedArea)}m²`,
            unitRate: 65.0,
            totalCost: slopedArea * effectiveMultiplier * 65.0,
            isUnlinked: m.isUnlinkedMultiplier,
            revision: m.revision,
            color: m.color
          });
        }

        // Edge Tagging Quantities (Ridge, Valley, Eave, Hip, Rake)
        const edges = getPolygonEdges(m.points, pxPerM, m.edgeTags);
        const edgeTotals: Record<EdgeTag, number> = {
          none: 0,
          ridge: 0,
          valley: 0,
          eave: 0,
          hip: 0,
          rake: 0
        };

        for (const edge of edges) {
          edgeTotals[edge.tag] += edge.lengthMeters;
        }

        if ((cfg.outputRidge ?? true) && edgeTotals.ridge > 0) {
          rows.push({
            id: `${m.id}_roof_ridge`,
            measurementId: m.id,
            measurementUid: m.uid,
            itemName: `${m.name} - Ridge Capping`,
            folderId: m.folderId,
            folderName,
            folderMultiplier,
            trade: 'Roofing & Rainwater',
            grossQty: edgeTotals.ridge,
            deductions: 0,
            deductionNotes: 'Tagged Edges',
            netTotal: edgeTotals.ridge,
            factoredTotal: edgeTotals.ridge * effectiveMultiplier,
            unit: 'm',
            formula: `Ridge Edges: ${formatDim(edgeTotals.ridge)}m`,
            unitRate: 35.0,
            totalCost: edgeTotals.ridge * effectiveMultiplier * 35.0,
            isUnlinked: m.isUnlinkedMultiplier,
            revision: m.revision,
            color: m.color
          });
        }

        if ((cfg.outputValley ?? true) && edgeTotals.valley > 0) {
          rows.push({
            id: `${m.id}_roof_valley`,
            measurementId: m.id,
            measurementUid: m.uid,
            itemName: `${m.name} - Valley Gutter Flashing`,
            folderId: m.folderId,
            folderName,
            folderMultiplier,
            trade: 'Roofing & Rainwater',
            grossQty: edgeTotals.valley,
            deductions: 0,
            deductionNotes: 'Tagged Edges',
            netTotal: edgeTotals.valley,
            factoredTotal: edgeTotals.valley * effectiveMultiplier,
            unit: 'm',
            formula: `Valley Edges: ${formatDim(edgeTotals.valley)}m`,
            unitRate: 42.0,
            totalCost: edgeTotals.valley * effectiveMultiplier * 42.0,
            isUnlinked: m.isUnlinkedMultiplier,
            revision: m.revision,
            color: m.color
          });
        }

        if ((cfg.outputEave ?? true) && edgeTotals.eave > 0) {
          rows.push({
            id: `${m.id}_roof_eave`,
            measurementId: m.id,
            measurementUid: m.uid,
            itemName: `${m.name} - Eaves & Half-Round Gutters`,
            folderId: m.folderId,
            folderName,
            folderMultiplier,
            trade: 'Roofing & Rainwater',
            grossQty: edgeTotals.eave,
            deductions: 0,
            deductionNotes: 'Tagged Edges',
            netTotal: edgeTotals.eave,
            factoredTotal: edgeTotals.eave * effectiveMultiplier,
            unit: 'm',
            formula: `Eave Edges: ${formatDim(edgeTotals.eave)}m`,
            unitRate: 28.0,
            totalCost: edgeTotals.eave * effectiveMultiplier * 28.0,
            isUnlinked: m.isUnlinkedMultiplier,
            revision: m.revision,
            color: m.color
          });
        }

        if ((cfg.outputHip ?? true) && edgeTotals.hip > 0) {
          rows.push({
            id: `${m.id}_roof_hip`,
            measurementId: m.id,
            measurementUid: m.uid,
            itemName: `${m.name} - Hip Capping Flashing`,
            folderId: m.folderId,
            folderName,
            folderMultiplier,
            trade: 'Roofing & Rainwater',
            grossQty: edgeTotals.hip,
            deductions: 0,
            deductionNotes: 'Tagged Edges',
            netTotal: edgeTotals.hip,
            factoredTotal: edgeTotals.hip * effectiveMultiplier,
            unit: 'm',
            formula: `Hip Edges: ${formatDim(edgeTotals.hip)}m`,
            unitRate: 36.0,
            totalCost: edgeTotals.hip * effectiveMultiplier * 36.0,
            isUnlinked: m.isUnlinkedMultiplier,
            revision: m.revision,
            color: m.color
          });
        }

        if ((cfg.outputRake ?? true) && edgeTotals.rake > 0) {
          rows.push({
            id: `${m.id}_roof_rake`,
            measurementId: m.id,
            measurementUid: m.uid,
            itemName: `${m.name} - Gable Bargeboard / Rake Flashing`,
            folderId: m.folderId,
            folderName,
            folderMultiplier,
            trade: 'Roofing & Rainwater',
            grossQty: edgeTotals.rake,
            deductions: 0,
            deductionNotes: 'Tagged Edges',
            netTotal: edgeTotals.rake,
            factoredTotal: edgeTotals.rake * effectiveMultiplier,
            unit: 'm',
            formula: `Rake Edges: ${formatDim(edgeTotals.rake)}m`,
            unitRate: 25.0,
            totalCost: edgeTotals.rake * effectiveMultiplier * 25.0,
            isUnlinked: m.isUnlinkedMultiplier,
            revision: m.revision,
            color: m.color
          });
        }
        break;
      }

      // ----------------------------------------------------
      // C. CEILINGS & FINISHES (Vertical Logic, Bulkheads, Auto-Cornice)
      // ----------------------------------------------------
      case 'ceiling': {
        const cfg = m.recipeConfig as CeilingRecipeConfig;
        const rawCeilingArea = polygonAreaMeters(m.points, pxPerM);
        const perimeter = polygonPerimeterMeters(m.points, pxPerM);
        const drop = cfg.bulkheadDrop ?? 0;

        // Auto-Void deduction
        const voidInfo = voidDeductionsMap.get(m.id);
        const voidDeduction = voidInfo ? voidInfo.totalVoidAreaM2 : 0;
        const netPlanArea = Math.max(0, rawCeilingArea - voidDeduction);

        // Bulkhead calculation: Ceiling Area + (Perimeter * Drop Height)
        const bulkheadArea = perimeter * drop;
        const totalCeilingWithBulkhead = netPlanArea + bulkheadArea;

        // 1. Ceiling Area with Bulkhead Total
        if (cfg.outputBulkheadTotal ?? true) {
          const formulaStr =
            drop > 0
              ? voidDeduction > 0
                ? `${formatDim(rawCeilingArea)}m² - ${formatDim(voidDeduction)}m² (Void) + (${formatDim(perimeter)}m perim * ${formatDim(drop)}m drop) = ${formatDim(totalCeilingWithBulkhead)}m²`
                : `${formatDim(netPlanArea)}m² + (${formatDim(perimeter)}m perim * ${formatDim(drop)}m drop [${formatDim(bulkheadArea)}m²]) = ${formatDim(totalCeilingWithBulkhead)}m²`
              : voidDeduction > 0
              ? `${formatDim(rawCeilingArea)}m² - ${formatDim(voidDeduction)}m² (Void) = ${formatDim(netPlanArea)}m²`
              : `${formatDim(netPlanArea)}m²`;

          rows.push({
            id: `${m.id}_ceiling_total`,
            measurementId: m.id,
            measurementUid: m.uid,
            itemName:
              drop > 0
                ? `${m.name} - Plasterboard Ceiling with Bulkhead (${formatDim(drop)}m drop)`
                : `${m.name} - Plasterboard Ceiling`,
            folderId: m.folderId,
            folderName,
            folderMultiplier,
            trade: 'Ceilings & Partitions',
            grossQty: rawCeilingArea + bulkheadArea,
            deductions: voidDeduction,
            deductionNotes:
              voidInfo && voidInfo.voidCount > 0
                ? `Auto-Void Subtraction (${voidInfo.voidNames.join(', ')})`
                : 'None',
            netTotal: totalCeilingWithBulkhead,
            factoredTotal: totalCeilingWithBulkhead * effectiveMultiplier,
            unit: 'm²',
            formula: formulaStr,
            unitRate: 38.0,
            totalCost: totalCeilingWithBulkhead * effectiveMultiplier * 38.0,
            isUnlinked: m.isUnlinkedMultiplier,
            revision: m.revision,
            color: m.color
          });
        }

        // 2. Auto-Cornice (Perimeter)
        if (cfg.outputCornice ?? true) {
          rows.push({
            id: `${m.id}_ceiling_cornice`,
            measurementId: m.id,
            measurementUid: m.uid,
            itemName: `${m.name} - Auto-Cornice / Cove Moulding`,
            folderId: m.folderId,
            folderName,
            folderMultiplier,
            trade: 'Ceilings & Partitions',
            grossQty: perimeter,
            deductions: 0,
            deductionNotes: 'Derived from room perimeter',
            netTotal: perimeter,
            factoredTotal: perimeter * effectiveMultiplier,
            unit: 'm',
            formula: `Room Perimeter: ${formatDim(perimeter)}m`,
            unitRate: 14.5,
            totalCost: perimeter * effectiveMultiplier * 14.5,
            isUnlinked: m.isUnlinkedMultiplier,
            revision: m.revision,
            color: m.color
          });
        }
        break;
      }

      // ----------------------------------------------------
      // D. FLOORING & FINISHES (Auto-Voids & Method 2 Door Deductions)
      // ----------------------------------------------------
      case 'floor': {
        const cfg = m.recipeConfig as FloorRecipeConfig;
        const rawFloorArea = polygonAreaMeters(m.points, pxPerM);
        const perimeter = polygonPerimeterMeters(m.points, pxPerM);
        const thickness = cfg.thickness ?? 0.15;

        // Auto-Void deduction
        const voidInfo = voidDeductionsMap.get(m.id);
        const voidDeduction = voidInfo ? voidInfo.totalVoidAreaM2 : 0;
        const netArea = Math.max(0, rawFloorArea - voidDeduction);

        // 1. Net Floor Area
        if (cfg.outputNetArea ?? true) {
          const formulaStr =
            voidDeduction > 0
              ? `${formatDim(rawFloorArea)}m² - ${formatDim(voidDeduction)}m² (Auto-Void) = ${formatDim(netArea)}m²`
              : `${formatDim(rawFloorArea)}m² (Shoelace)`;

          rows.push({
            id: `${m.id}_floor_area`,
            measurementId: m.id,
            measurementUid: m.uid,
            itemName: `${m.name} - Floor Finish / Screed Area`,
            folderId: m.folderId,
            folderName,
            folderMultiplier,
            trade: 'Finishes & Flooring',
            grossQty: rawFloorArea,
            deductions: voidDeduction,
            deductionNotes:
              voidInfo && voidInfo.voidCount > 0
                ? `Auto-Void: ${voidInfo.voidNames.join(', ')}`
                : 'None',
            netTotal: netArea,
            factoredTotal: netArea * effectiveMultiplier,
            unit: 'm²',
            formula: formulaStr,
            unitRate: 52.0,
            totalCost: netArea * effectiveMultiplier * 52.0,
            isUnlinked: m.isUnlinkedMultiplier,
            revision: m.revision,
            color: m.color
          });
        }

        // 2. Concrete Slab Volume (Net Area * Thickness)
        if (cfg.outputSlabVolume) {
          const slabVol = netArea * thickness;
          rows.push({
            id: `${m.id}_floor_slab_vol`,
            measurementId: m.id,
            measurementUid: m.uid,
            itemName: `${m.name} - Reinforced Concrete Slab (${formatDim(thickness * 1000, 0)}mm)`,
            folderId: m.folderId,
            folderName,
            folderMultiplier,
            trade: 'Finishes & Flooring',
            grossQty: slabVol,
            deductions: 0,
            deductionNotes: 'None',
            netTotal: slabVol,
            factoredTotal: slabVol * effectiveMultiplier,
            unit: 'm³',
            formula: `${formatDim(netArea)}m² * ${formatDim(thickness)}m = ${formatDim(slabVol)}m³`,
            unitRate: 165.0,
            totalCost: slabVol * effectiveMultiplier * 165.0,
            isUnlinked: m.isUnlinkedMultiplier,
            revision: m.revision,
            color: m.color
          });
        }

        // 3. Method 2 Door Deduction for Skirting
        if (cfg.outputSkirting ?? true) {
          const doorInfo = folderDoorStats.get(m.folderId);
          let doorDeduction = 0;
          let doorDeductionText = 'No doors in folder';

          if ((cfg.autoDeductDoors ?? true) && doorInfo && doorInfo.count > 0) {
            doorDeduction = doorInfo.totalWidth;
            doorDeductionText = `Method 2: Auto-deducted ${doorInfo.count} door(s) [${doorInfo.items.join(', ')}]`;
          }

          const netSkirting = Math.max(0, perimeter - doorDeduction);
          const formulaStr =
            doorDeduction > 0
              ? `${formatDim(perimeter)}m (Perimeter) - ${formatDim(doorDeduction)}m (${doorInfo?.count} Doors @ ${formatDim(doorInfo?.totalWidth! / doorInfo?.count!)}m) = ${formatDim(netSkirting)}m`
              : `${formatDim(perimeter)}m (Perimeter without door deduction)`;

          rows.push({
            id: `${m.id}_floor_skirting`,
            measurementId: m.id,
            measurementUid: m.uid,
            itemName: `${m.name} - Skirting / Baseboard`,
            folderId: m.folderId,
            folderName,
            folderMultiplier,
            trade: 'Finishes & Flooring',
            grossQty: perimeter,
            deductions: doorDeduction,
            deductionNotes: doorDeductionText,
            netTotal: netSkirting,
            factoredTotal: netSkirting * effectiveMultiplier,
            unit: 'm',
            formula: formulaStr,
            unitRate: 16.5,
            totalCost: netSkirting * effectiveMultiplier * 16.5,
            isUnlinked: m.isUnlinkedMultiplier,
            revision: m.revision,
            color: m.color
          });
        }
        break;
      }

      // ----------------------------------------------------
      // E. COUNT ITEMS (Doors, Sanitary, Structural Columns)
      // ----------------------------------------------------
      case 'count': {
        const cfg = m.recipeConfig as CountRecipeConfig;
        const count = m.points.length;
        const unitRate = cfg.unitRate ?? 220.0;
        const itemType = cfg.itemType || 'Count Item';

        rows.push({
          id: `${m.id}_count`,
          measurementId: m.id,
          measurementUid: m.uid,
          itemName: `${m.name} [${itemType}]`,
          folderId: m.folderId,
          folderName,
          folderMultiplier,
          trade: 'Doors, Fittings & Equipment',
          grossQty: count,
          deductions: 0,
          deductionNotes: 'None',
          netTotal: count,
          factoredTotal: count * effectiveMultiplier,
          unit: 'nr',
          formula: `${count} units counted on sheet`,
          unitRate,
          totalCost: count * effectiveMultiplier * unitRate,
          isUnlinked: m.isUnlinkedMultiplier,
          revision: m.revision,
          color: m.color
        });
        break;
      }

      // ----------------------------------------------------
      // F. CUSTOM RECIPES
      // ----------------------------------------------------
      default: {
        const len = m.tool === 'line' ? lineLengthMeters(m.points, pxPerM) : 0;
        const area =
          m.tool === 'polygon' || m.tool === 'rectangle'
            ? polygonAreaMeters(m.points, pxPerM)
            : 0;
        const val = area > 0 ? area : len;
        const unit = area > 0 ? 'm²' : 'm';

        rows.push({
          id: `${m.id}_custom`,
          measurementId: m.id,
          measurementUid: m.uid,
          itemName: m.name,
          folderId: m.folderId,
          folderName,
          folderMultiplier,
          trade: 'General Takeoff',
          grossQty: val,
          deductions: 0,
          deductionNotes: 'None',
          netTotal: val,
          factoredTotal: val * effectiveMultiplier,
          unit,
          formula: `${formatDim(val)}${unit}`,
          unitRate: 20.0,
          totalCost: val * effectiveMultiplier * 20.0,
          isUnlinked: m.isUnlinkedMultiplier,
          revision: m.revision,
          color: m.color
        });
        break;
      }
    }
  }

  return rows;
}
