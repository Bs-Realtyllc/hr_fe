'use client';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { memo } from 'react';
import type { PersonFlowNode } from '../utils/layout';
import NodeToggle from './NodeToggle';
import { useOrgChartContext } from './OrgChartContext';
import PersonCard from './PersonCard';

/** React Flow wrapper around PersonCard: edge anchors and the collapse toggle. */
function PersonNode({ id, data }: NodeProps<PersonFlowNode>) {
  const { member, directCount, totalCount } = data;
  const { currentUserId, highlightedId, showDepartment, openPerson, selectedEmployeeId } =
    useOrgChartContext();
  return (
    <div className="org-node">
      <Handle type="target" position={Position.Top} isConnectable={false} className="org-handle" />
      <PersonCard
        member={member}
        directCount={directCount}
        totalCount={totalCount}
        isMe={currentUserId === member.id}
        highlighted={highlightedId === id}
        showDepartment={showDepartment}
        onOpen={openPerson ? () => openPerson(member.id) : undefined}
        selected={selectedEmployeeId === member.id}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        isConnectable={false}
        className="org-handle"
      />
      <NodeToggle
        id={id}
        label={member.name}
        childCount={data.childCount}
        collapsed={data.collapsed}
        hiddenCount={data.hiddenCount}
      />
    </div>
  );
}

export default memo(PersonNode);
