'use client';
import { createContext, useContext } from 'react';

export interface OrgChartContextValue {
  /** The signed-in user's employee id, to mark their card. */
  currentUserId: number | null;
  /** Node id briefly highlighted after search or "Find me". */
  highlightedId: string | null;
  /** Collapse or expand the box with this node id. */
  toggle: (id: string) => void;
  /** Show the department line on person cards (People view only). */
  showDepartment: boolean;
  /** Open a person's details panel; undefined = cards are not clickable. */
  openPerson?: (employeeId: number) => void;
  /** Employee whose details panel is open. */
  selectedEmployeeId: number | null;
}

// Shared with every node without putting it in node `data`, so highlighting
// or the signed-in user never forces a new layout.
export const OrgChartContext = createContext<OrgChartContextValue>({
  currentUserId: null,
  highlightedId: null,
  toggle: () => {},
  showDepartment: true,
  selectedEmployeeId: null,
});

export const useOrgChartContext = () => useContext(OrgChartContext);
