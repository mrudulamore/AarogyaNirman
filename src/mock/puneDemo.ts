import type { Contractor, Project, User } from '../types';

function withProjectManagerDemo<T extends { users: User[]; projects: Project[] }>(data: T): T {
  const manager = data.users.find(user => user.role === 'PROJECT_MANAGER');
  const alternate = data.users.find(user => user.role === 'PROJECT_MANAGER' && user.id !== manager?.id);
  const hospitals = ['Pune', 'Satara'].map(district => data.projects.find(project => project.district === district));
  if (!manager || !alternate || hospitals.some(project => !project)) return data;
  const ids = hospitals.map(project => project!.id);
  const projects = data.projects.map(project => ({ ...project,
    projectManagerId: ids.includes(project.id) ? manager.id : project.projectManagerId === manager.id ? alternate.id : project.projectManagerId,
  }));
  const users = data.users.map(user => user.id === manager.id
    ? { ...user, division: 'Pune Division', assignedProjectIds: ids }
    : user.role === 'PROJECT_MANAGER'
      ? { ...user, assignedProjectIds: [...new Set([...user.assignedProjectIds.filter(id => !ids.includes(id)), ...projects.filter(project => project.projectManagerId === user.id).map(project => project.id)])] }
      : user);
  return { ...data, projects, users, puneDemoVersion: 3 };
}

/** One-time demo account setup; retain project records and submitted inspection history. */
export function withPuneDemo<T extends { users: User[]; projects: Project[]; contractors: Contractor[]; puneDemoVersion?: number }>(data: T): T {
  if (data.puneDemoVersion === 3) return data;
  if (data.puneDemoVersion === 2) return withProjectManagerDemo(data);
  const pune = data.projects.filter(p => p.division === 'Pune Division');
  const ids = pune.map(p => p.id);
  const ee = data.users.find(u => u.role === 'EXECUTIVE_ENGINEER');
  const je = data.users.find(u => u.role === 'DEPUTY_ENGINEER');
  const otherEe = data.users.find(u => u.role === 'EXECUTIVE_ENGINEER' && u.id !== ee?.id);
  const otherJe = data.users.find(u => u.role === 'DEPUTY_ENGINEER' && u.id !== je?.id);
  if (!pune.length || !ee || !je || !otherEe || !otherJe) return data;
  const demoJeIds = [je.id, 'PUNE-DEMO-JE-1', 'PUNE-DEMO-JE-2', 'PUNE-DEMO-JE-3', 'PUNE-DEMO-JE-4'];
  const projects = data.projects.map(p => ({ ...p,
    executiveEngineerId: ids.includes(p.id) ? ee.id : p.executiveEngineerId === ee.id ? otherEe.id : p.executiveEngineerId,
    siteEngineerId: ids.includes(p.id) ? demoJeIds[ids.indexOf(p.id)] ?? p.siteEngineerId : demoJeIds.includes(p.siteEngineerId) ? otherJe.id : p.siteEngineerId,
  }));
  const users = data.users.map(u => u.id === ee.id
    ? { ...u, division: 'Pune Division', department: 'PWD, Pune Division', assignedProjectIds: ids }
    : u.role === 'DEPUTY_ENGINEER'
      ? { ...u, ...(demoJeIds.includes(u.id) ? { division: 'Pune Division', department: 'PWD, Pune Division' } : {}), assignedProjectIds: demoJeIds.includes(u.id) ? projects.filter(p => p.siteEngineerId === u.id).map(p => p.id) : u.assignedProjectIds.filter(id => !ids.includes(id)) }
      : u);
  ['Aditya Patil', 'Sneha Deshmukh', 'Rohan Jadhav', 'Priya Shinde'].forEach((name, index) => {
    const id = `PUNE-DEMO-JE-${index + 1}`;
    if (!users.some(u => u.id === id)) users.push({
      id, name, role: 'DEPUTY_ENGINEER', designation: 'Junior Engineer',
      department: 'PWD, Pune Division', division: 'Pune Division',
      email: `pune.je${index + 1}@example.test`, phone: '', assignedProjectIds: projects.filter(p => p.siteEngineerId === id).map(p => p.id),
      avatarInitials: name.split(' ').map(part => part[0]).join(''), availability: 'AVAILABLE',
    });
  });
  const firm = data.contractors.find(c => c.id === pune[0].contractorId);
  if (firm && !users.some(u => u.id === 'PUNE-DEMO-CONTRACTOR')) users.unshift({
    id: 'PUNE-DEMO-CONTRACTOR', name: firm.contactPerson, role: 'CONTRACTOR',
    designation: 'Contractor', department: firm.company, division: 'Pune Division',
    contractorId: firm.id, email: firm.email, phone: firm.phone,
    assignedProjectIds: pune.filter(p => p.contractorId === firm.id).map(p => p.id),
    avatarInitials: firm.contactPerson.split(' ').map(part => part[0]).join(''),
  });
  return withProjectManagerDemo({ ...data, projects, users, puneDemoVersion: 2 });
}
