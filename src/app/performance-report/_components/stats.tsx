import React from 'react';

interface StatsType{
    backlog :number;
    completed: number;
    started: number;
    total: number;
    unstarted: number;
}
interface StatsProps {
    stats: StatsType;
}

const Stats = ({stats}: StatsProps) => {
  return (
    <>
              <div className="grid grid-cols-3 gap-3">
            <div className="border border-gray-200 rounded-lg p-4">
              <p className="text-xs text-gray-400">Total tasks</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.total}</p>
            </div>
            <div className="border border-gray-200 rounded-lg p-4">
              <p className="text-xs text-gray-400">Completed</p>
              <p className="text-2xl font-semibold text-green-600">
                {stats.completed}
              </p>
            </div>
            <div className="border border-gray-200 rounded-lg p-4">
              <p className="text-xs text-gray-400">Started (in progress)</p>
              <p className="text-2xl font-semibold text-yellow-600">
                {stats.started}
              </p>
            </div>
            <div className="border border-gray-200 rounded-lg p-4">
              <p className="text-xs text-gray-400">Backlog</p>
              <p className="text-2xl font-semibold text-gray-600">
                {stats.backlog}
              </p>
            </div>
            <div className="border border-gray-200 rounded-lg p-4">
              <p className="text-xs text-gray-400">Unstarted (todo)</p>
              <p className="text-2xl font-semibold text-slate-600">
                {stats.unstarted}
              </p>
            </div>
            <div className="border border-gray-200 rounded-lg p-4">
              <p className="text-xs text-gray-400">Completion rate</p>
              <p className="text-2xl font-semibold text-gray-900">
                {stats.total ? Math.round((stats.completed / stats.total) * 100) : 0}%
              </p>
            </div>
          </div>
    </>
  )
}

export default Stats