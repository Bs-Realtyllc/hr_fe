// Types used only by the org-chart feature.

/** One row of GET /org-chart. Mirrors hr_be orgChart.repository. */
export interface OrgChartMember {
  id: number;
  name: string;
  profile_picture: string | null;
  designation: string | null;
  department_id: number | null;
  department: string | null;
  manager_id: number | null;
  status: string;
}

/** A person in the built reporting tree. */
export interface OrgNode {
  member: OrgChartMember;
  /** Direct reports, sorted by name. */
  children: OrgNode[];
  /** 0 for people with no manager. */
  depth: number;
  /** Number of direct reports. */
  directCount: number;
  /** Everyone below this person, at any depth. */
  totalCount: number;
}

export interface OrgTree {
  /** People with no manager on the chart (the top of the tree). */
  roots: OrgNode[];
  /** Every node by employee id, for search and "Find me". */
  byId: Map<number, OrgNode>;
  stats: {
    people: number;
    /** Depth of the deepest reporting chain (1 = everyone is a root). */
    levels: number;
    departments: number;
  };
}

/** Which tree the chart shows. */
export type OrgChartViewMode = 'people' | 'teams';

/**
 * A node in the Teams view: company → departments → people. Inside a
 * department, people still hang under their manager when the manager is in
 * the same department.
 */
export type TeamChartNode =
  | {
      kind: 'company';
      id: string;
      name: string;
      teamCount: number;
      peopleCount: number;
      children: TeamChartNode[];
    }
  | { kind: 'team'; id: string; name: string; peopleCount: number; children: TeamChartNode[] }
  | {
      kind: 'person';
      id: string;
      member: OrgChartMember;
      /** Reports inside the same team. */
      directCount: number;
      totalCount: number;
      children: TeamChartNode[];
    };
