import assert from 'node:assert/strict';
import { createServer } from 'vite';
const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' });
try {
  const { generateMockData } = await server.ssrLoadModule('/src/mock/seed.ts');
  const { extendDemoPortfolio } = await server.ssrLoadModule('/src/mock/demoPortfolio.ts');
  const { withPuneDemo } = await server.ssrLoadModule('/src/mock/puneDemo.ts');
  const original = extendDemoPortfolio(generateMockData());
  const fresh = withPuneDemo(original);
  const actual = { ...original.inspections[0], id: 'INS-live-entry', inspector: 'Actual inspector', assignedToId: 'actual-user', createdById: 'actual-ee' };
  const migrated = withPuneDemo({ ...fresh, puneDemoVersion: 3, inspections: [...original.inspections, actual], inspectionAppointments: original.inspectionAppointments, qualityReports: original.qualityReports, qualityFailures: original.qualityFailures });
  for (const data of [fresh, migrated]) {
    const projects = data.projects.filter(p => p.division === 'Pune Division');
    for (const project of projects) {
      const je = data.users.find(u => u.id === project.siteEngineerId);
      const ee = data.users.find(u => u.id === project.executiveEngineerId);
      const firm = data.contractors.find(c => c.id === project.contractorId);
      const contractor = data.users.find(u => u.role === 'CONTRACTOR' && u.contractorId === firm.id && u.assignedProjectIds.includes(project.id));
      for (const inspection of data.inspections.filter(i => i.projectId === project.id && i.id !== actual.id)) {
        assert.equal(inspection.inspector, je.name);
        assert.equal(inspection.assignedToId, je.id);
        assert.equal(inspection.createdById, ee.id);
        assert.equal(inspection.assignmentHistory[0].assignedBy, ee.name);
      }
      for (const appointment of data.inspectionAppointments.filter(a => a.projectId === project.id)) {
        assert.equal(appointment.assignedInspector, je.name);
        assert.equal(appointment.assignedBy, ee.name);
        assert.equal(appointment.requestedBy, contractor?.name ?? firm.contactPerson);
        assert.equal(appointment.governmentPoc, je.name);
      }
    }
    assert.equal(withPuneDemo(data), data);
  }
  assert.equal(migrated.inspections.find(i => i.id === actual.id), actual);
  console.log('Fresh and saved demo inspection names match assigned JE, EE and contractor; actual assignments remain unchanged.');
} finally { await server.close(); }
