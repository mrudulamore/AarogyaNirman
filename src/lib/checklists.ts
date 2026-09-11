import type { InspectionCategory } from '../types';

export const CHECKLIST_REQUIREMENTS: Record<InspectionCategory, string[]> = {
  STRUCTURAL: ['Column reinforcement as per drawing', 'Concrete cube strength (M25)', 'Slab thickness tolerance', 'Shuttering alignment'],
  CIVIL: ['Plaster thickness', 'Brick masonry bond', 'DPC level', 'Wall plumb check'],
  ELECTRICAL: ['Cable sizing as per load', 'Earthing resistance', 'DB panel labelling', 'Conduit concealment'],
  PLUMBING: ['Pipe pressure test', 'Slope of drainage line', 'Fixture fitment', 'Leak test'],
  FIRE_SAFETY: ['Sprinkler spacing', 'Fire hydrant pressure', 'Smoke detector coverage', 'Fire door rating'],
  HVAC: ['Duct insulation', 'AHU airflow rate', 'Chiller capacity check', 'Damper operation'],
  WATERPROOFING: ['Membrane overlap', 'Ponding test — terrace', 'Bathroom sunken slab test', 'Expansion joint sealing'],
  MEDICAL_GAS: ['Pipeline pressure test', 'Outlet labelling', 'Alarm panel function', 'Manifold room ventilation'],
  LIFT: ['Governor rope tension', 'Door interlock safety', 'Emergency rescue operation', 'Load test'],
  ACCESSIBILITY: ['Ramp gradient (1:12)', 'Handrail height', 'Accessible toilet clearance', 'Tactile flooring'],
  FINISHING: ['Tile alignment', 'Paint uniformity', 'False ceiling level', 'Door/window hardware'],
  SITE_SAFETY: ['PPE compliance', 'Scaffolding stability', 'Barricading', 'Fire extinguisher availability'],
};

export const CHECKLIST_STANDARDS: Record<InspectionCategory, string> = {
  STRUCTURAL: 'IS 456:2000', CIVIL: 'IS 1905', ELECTRICAL: 'IS 732', PLUMBING: 'IS 2065',
  FIRE_SAFETY: 'NBC 2016 Part 4', HVAC: 'ISHRAE Standard', WATERPROOFING: 'IS 3067',
  MEDICAL_GAS: 'HTM 02-01', LIFT: 'IS 14665', ACCESSIBILITY: 'Harmonised Guidelines 2021',
  FINISHING: 'IS 1542', SITE_SAFETY: 'BOCW Act 1996',
};
