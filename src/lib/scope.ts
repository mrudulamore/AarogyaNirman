import { useMemo } from 'react';
import { useStore } from '../store/useStore';
import { computeProjectScope, type ProjectScope } from './projectScope';
export { computeProjectScope, type ProjectScope } from './projectScope';

/** Convenience hook: pulls projects/contractors from the store and returns the scope for the signed-in user, memoized. */
export function useProjectScope(): ProjectScope {
  const currentUser = useStore((s) => s.currentUser);
  const projects = useStore((s) => s.projects);
  const contractors = useStore((s) => s.contractors);
  return useMemo(() => computeProjectScope(currentUser, projects, contractors), [currentUser, projects, contractors]);
}
