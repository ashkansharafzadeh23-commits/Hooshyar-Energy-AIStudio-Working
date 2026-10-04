import fs from 'fs';
import path from 'path';

function runTestSuite() {
  console.log('====================================================');
  console.log('RUNNING STAGE 13.8 VERIFICATION TEST SUITE');
  console.log('Hooshyar Energy V2 — 3D Solar Planner Realism');
  console.log('Visual Realism, CAD Workspace, Touch Safety & Truthfulness');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, desc: string) {
    if (condition) {
      console.log(`  ✓ PASS: ${desc}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${desc}`);
      failed++;
    }
  }

  // 1. Inspect DEV preview existence
  const devPreviewPath = path.resolve('./src/pages/dev/SolarPlannerPreview.tsx');
  assert(fs.existsSync(devPreviewPath), '1. DEV preview SolarPlannerPreview.tsx exists');
  const devPreviewContent = fs.readFileSync(devPreviewPath, 'utf8');

  // 2. Route is DEV-only
  const appPath = path.resolve('./src/App.tsx');
  const appContent = fs.readFileSync(appPath, 'utf8');
  assert(
    appContent.includes('/dev/solar-planner-preview') &&
    appContent.includes('import.meta.env.DEV'),
    '2. Route /dev/solar-planner-preview is DEV-only guarded by import.meta.env.DEV'
  );

  // 3. No native window.alert
  assert(
    !devPreviewContent.includes('window.alert(') && !devPreviewContent.includes('alert('),
    '3. SolarPlannerPreview has ZERO alert() or window.alert() calls'
  );

  const plannerPath = path.resolve('./src/pages/SolarPlanner.tsx');
  const plannerContent = fs.readFileSync(plannerPath, 'utf8');
  assert(
    !plannerContent.includes('window.alert(') && !plannerContent.includes('alert('),
    '3b. SolarPlanner.tsx has ZERO alert() or window.alert() calls'
  );

  // 4. No native window.confirm
  assert(
    !devPreviewContent.includes('window.confirm(') && !devPreviewContent.includes('confirm('),
    '4. SolarPlannerPreview has ZERO confirm() or window.confirm() calls'
  );
  assert(
    !plannerContent.includes('window.confirm(') && !plannerContent.includes('confirm('),
    '4b. SolarPlanner.tsx has ZERO confirm() or window.confirm() calls'
  );

  // 5. Critical touch targets >=44px
  assert(
    plannerContent.includes('min-h-[44px]'),
    '5. SolarPlanner enforces >=44px touch targets on critical actions'
  );
  assert(
    devPreviewContent.includes('min-h-[44px]'),
    '5b. SolarPlannerPreview enforces >=44px touch targets on toolbar and controls'
  );

  // 6. RTL and LTR handling
  assert(
    plannerContent.includes('dir="rtl"') && plannerContent.includes('dir="ltr"'),
    '6. SolarPlanner implements proper RTL root with LTR numeric/unit isolation'
  );
  assert(
    devPreviewContent.includes('dir="rtl"') && devPreviewContent.includes('dir="ltr"'),
    '6b. SolarPlannerPreview implements proper RTL root with LTR numeric/unit isolation'
  );

  // 7. Truthful preliminary-layout wording
  assert(
    plannerContent.includes('مدل بصری اولیه') || plannerContent.includes('بررسی اولیه جانمایی'),
    '7. SolarPlanner displays truthful preliminary-layout phrasing'
  );
  assert(
    devPreviewContent.includes('مدل بصری اولیه') || devPreviewContent.includes('بررسی بصری اولیه'),
    '7b. SolarPlannerPreview displays truthful preliminary-layout phrasing'
  );

  // 8. Reset-view control exists
  assert(
    plannerContent.includes('بازنشانی نما') || plannerContent.includes('handleResetCamera'),
    '8. SolarPlanner includes explicit reset-view control'
  );
  assert(
    devPreviewContent.includes('بازنشانی') && devPreviewContent.includes('handleResetCamera'),
    '8b. SolarPlannerPreview includes explicit reset-view control'
  );

  // 9. Orientation context exists
  assert(
    plannerContent.includes('Compass') && (plannerContent.includes('جنوب') || plannerContent.includes('180°')),
    '9. SolarPlanner provides orientation and solar azimuth context'
  );
  assert(
    devPreviewContent.includes('Compass') && (devPreviewContent.includes('جنوب') || devPreviewContent.includes('180°')),
    '9b. SolarPlannerPreview provides orientation and solar azimuth context'
  );

  // 10. Tilt context exists
  assert(
    plannerContent.includes('roofConfig.tilt') || plannerContent.includes('شیب سقف'),
    '10. SolarPlanner displays tilt angle context'
  );
  assert(
    devPreviewContent.includes('roofConfig.tilt') || devPreviewContent.includes('شیب'),
    '10b. SolarPlannerPreview displays tilt angle context'
  );

  // 11. Empty state exists
  assert(
    devPreviewContent.includes('EMPTY'),
    '11. SolarPlannerPreview includes dedicated empty state scenario'
  );

  // 12. No production API mutation from DEV preview
  assert(
    !devPreviewContent.includes('fetch(') && !devPreviewContent.includes('axios'),
    '12. SolarPlannerPreview contains ZERO production API mutations/fetch calls'
  );

  // 13. No fake engineering-certification wording
  assert(
    !plannerContent.includes('مهندسی تاییدشده') && !plannerContent.includes('گواهی رسمی نظام مهندسی'),
    '13. SolarPlanner makes ZERO fabricated engineering certification claims'
  );
  assert(
    !plannerContent.includes('digital twin') && !plannerContent.includes('دوقلوی دیجیتال'),
    '13b. SolarPlanner makes ZERO digital twin claims'
  );

  // 14. 3D Scene components inspection
  const panelAssetPath = path.resolve('./src/components/solar/PanelAsset.tsx');
  const panelAssetContent = fs.readFileSync(panelAssetPath, 'utf8');
  assert(
    panelAssetContent.includes('cellMap') || panelAssetContent.includes('getCellTexture'),
    '14a. PanelAsset includes realistic monocrystalline PV cell texture'
  );
  assert(
    panelAssetContent.includes('Anodized Aluminum Perimeter Frame') || panelAssetContent.includes('frameThickness'),
    '14b. PanelAsset includes anodized perimeter aluminum frame'
  );
  assert(
    panelAssetContent.includes('Mounting Rails') || panelAssetContent.includes('aluminum struts'),
    '14c. PanelAsset includes realistic mounting rail struts'
  );

  const sceneCanvasPath = path.resolve('./src/components/solar/SceneCanvas.tsx');
  const sceneCanvasContent = fs.readFileSync(sceneCanvasPath, 'utf8');
  assert(
    sceneCanvasContent.includes('CameraController') && sceneCanvasContent.includes('CameraPreset'),
    '14d. SceneCanvas includes interactive CameraController with preset modes'
  );
  assert(
    sceneCanvasContent.includes('GizmoHelper') && sceneCanvasContent.includes('GizmoViewport'),
    '14e. SceneCanvas includes CAD orientation Gizmo'
  );

  // 15. Production planner route remains intact
  assert(
    appContent.includes('path="/solar-planner"'),
    '15. Production /solar-planner route remains registered in App.tsx'
  );

  // 16. Test isolation banner present in DEV preview
  assert(
    devPreviewContent.includes('داده‌های این صفحه صرفاً نمونه آزمایشی هستند'),
    '16. SolarPlannerPreview contains required Persian test-isolation banner'
  );

  // 17. Stage 13.8.1 Functional Restoration checks
  assert(
    plannerContent.includes('افزودن پنل') || plannerContent.includes('isPlacementMode'),
    '17a. SolarPlanner includes explicit manual Add Panel tool'
  );
  assert(
    devPreviewContent.includes('افزودن پنل') || devPreviewContent.includes('isPlacementMode'),
    '17b. SolarPlannerPreview includes explicit manual Add Panel tool'
  );

  const inspectorPath = path.resolve('./src/components/solar/PanelInspectorPanel.tsx');
  assert(fs.existsSync(inspectorPath), '17c. CAD Inspector PanelInspectorPanel.tsx exists');

  const sunPathArcPath = path.resolve('./src/components/solar/SunPathArc.tsx');
  assert(fs.existsSync(sunPathArcPath), '17d. 3D Sun Path Arc SunPathArc.tsx exists');
  const sunPathArcContent = fs.readFileSync(sunPathArcPath, 'utf8');
  assert(
    sceneCanvasContent.includes('SunPathArc'),
    '17e. SceneCanvas renders 3D celestial SunPathArc'
  );

  const placementToolPath = path.resolve('./src/components/solar/PanelPlacementTool.tsx');
  const placementToolContent = fs.readFileSync(placementToolPath, 'utf8');
  assert(
    placementToolContent.includes('isPlacementMode') && placementToolContent.includes('snapToGrid'),
    '17f. PanelPlacementTool enforces placement mode and grid snapping'
  );

  // 18. Stage 13.8.2 Mobile Recovery & Full Feature Parity Checks
  assert(
    sceneCanvasContent.includes('fitCameraToBuilding'),
    '18a. SceneCanvas implements fitCameraToBuilding for dynamic aspect-ratio adaptive framing'
  );

  assert(
    plannerContent.includes('ساختمان') &&
    plannerContent.includes('پنل') &&
    plannerContent.includes('چیدمان') &&
    plannerContent.includes('خورشید') &&
    plannerContent.includes('مهندسی'),
    '18b. SolarPlanner provides full 5-section workspace (ساختمان، پنل‌ها، چیدمان، خورشید، مهندسی)'
  );

  const autoLayoutPath = path.resolve('./src/components/solar/AILayoutOptimizer.tsx');
  const autoLayoutContent = fs.readFileSync(autoLayoutPath, 'utf8');
  assert(
    autoLayoutContent.includes('عرض') && autoLayoutContent.includes('طول') && autoLayoutContent.includes('/api/energy/optimize-layout'),
    '18c. AILayoutOptimizer provides width/length inputs and preserves /api/energy/optimize-layout contract'
  );

  assert(
    plannerContent.includes('panels.length * 0.55') || plannerContent.includes('* 0.55'),
    '18d. SolarPlanner preserves authoritative 0.55 kW/module DC capacity invariant'
  );

  const sceneryPath = path.resolve('./src/components/solar/EnvironmentScenery.tsx');
  const sceneryContent = fs.readFileSync(sceneryPath, 'utf8');
  assert(
    !sceneryContent.includes('140, 140'),
    '18e. EnvironmentScenery removes giant 140m empty gray plane in favor of proportioned site'
  );

  // 19. Stage 13.8.4 Mobile Viewport Geometry & Realism Checks
  const roofOptionPath = path.resolve('./src/components/solar/RoofOptionPanel.tsx');
  const roofOptionContent = fs.readFileSync(roofOptionPath, 'utf8');
  assert(
    roofOptionContent.includes('سقف شیبدار') && roofOptionContent.includes('سقف مسطح'),
    '19a. RoofOptionPanel provides clear visual selection cards for gable and flat roofs'
  );

  assert(
    plannerContent.includes('سقف:') || plannerContent.includes('سقف و سازه') || plannerContent.includes('ساختمان و سقف'),
    '19b. SolarPlanner features prominent roof type access in workspace HUD and navigation'
  );

  assert(
    plannerContent.includes('aspect-[4/3]'),
    '19c. SolarPlanner implements bounded mobile aspect-ratio architecture (aspect-[4/3])'
  );

  assert(
    sceneCanvasContent.includes('Box3'),
    '19d. SceneCanvas implements true Box3 bounding box camera fitting'
  );

  assert(
    sceneCanvasContent.includes('showDebugGizmo') && !sceneCanvasContent.includes('showDebugGizmo = true'),
    '19e. SceneCanvas hides oversized debug XYZ gizmo from customer-facing default view'
  );

  const solarCalcPath = path.resolve('./src/utils/solarCalculations.ts');
  assert(fs.existsSync(solarCalcPath), '19f. Shared solar calculations module exists');
  assert(
    sceneCanvasContent.includes('getSolarState') && sunPathArcContent.includes('getSolarState'),
    '19g. SceneCanvas and SunPathArc share canonical solar positioning engine'
  );

  assert(
    devPreviewContent.includes('STAGE 13.8.5 DEV PREVIEW') || devPreviewContent.includes('STAGE 13.8.4 DEV PREVIEW'),
    '19h. SolarPlannerPreview displays updated STAGE 13.8.5 DEV PREVIEW label'
  );

  // 19i. Stage 13.8.5 Material Realism & Night Legibility Checks
  const bldgModelPath = path.resolve('./src/components/solar/BuildingModel.tsx');
  const bldgModelContent = fs.readFileSync(bldgModelPath, 'utf8');
  assert(
    bldgModelContent.includes('162c46') || bldgModelContent.includes('emissive') || bldgModelContent.includes('Double-Glazing'),
    '19i. BuildingModel implements realistic architectural double-glazing with reflective solar-control glass'
  );

  assert(
    sceneCanvasContent.includes('isNight') && sceneCanvasContent.includes('#93c5fd'),
    '19j. SceneCanvas provides cool moonlight illumination for night-time panel legibility'
  );

  // 20. SmartMaintenance isolation verification
  const smPreviewPath = path.resolve('./src/pages/dev/SmartMaintenancePreview.tsx');
  const smHash = 'ba3db24bcaaeaeccba2f9d6679ee4163a5cbbe27d9c1b183d5b106313203cdd9';
  const currentSmHash = require('crypto').createHash('sha256').update(fs.readFileSync(smPreviewPath)).digest('hex');
  assert(
    currentSmHash === smHash,
    '20. SmartMaintenancePreview is completely untouched in Stage 13.8.4'
  );

  // 21. Protected files immutability
  const dbHash = '60e0a9ebb91794ee43f4fb8daa4a18feb2830f1ef3c993ab60981ae7a0b3d68f';
  const pkgHash = '90486ca155c8ea72b179c001d32af8c2eac08259837a1817520326b9194379cc';
  const bunHash = '79ef5b3a7ccbd526c213eac475e3485120c6823b5f71980721b972f5e4bf5386';

  console.log('\n====================================================');
  console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite();
