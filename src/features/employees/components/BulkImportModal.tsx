'use client';
import type { BulkImportState } from '../hooks/useBulkImport';

export default function BulkImportModal({ bulk }: { bulk: BulkImportState }) {
  const { showBulkModal, setShowBulkModal, errors, employeesToAdd, setEmployeesToAdd, selectedFile, setSelectedFile, isDragging, setIsDragging, fileError, setFileError, handleFileChange, handleDrop, handleBlukSubmit } = bulk;
  if (!showBulkModal) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={() => setShowBulkModal(false)}
    >
      <div
        className="w-full max-w-5xl max-h-[88vh] overflow-y-auto rounded-xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">
              Add Bulk Employees
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Import multiple employees using an Excel file
            </p>
          </div>

          <button
            className="flex h-8 w-8 items-center justify-center rounded-full text-2xl
                 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
            onClick={() => setShowBulkModal(false)}
          >
            ×
          </button>
        </div>

        <div className="p-6">
          {/* Upload Area */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`flex flex-col items-center justify-center rounded-xl
        border-2 border-dashed px-6 py-10 text-center transition
        ${isDragging
                ? "border-blue-500 bg-blue-50"
                : "border-gray-300 bg-gray-50 hover:border-blue-400"
              }`}
          >
            {/* Icon */}
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
              <span className="text-2xl">📊</span>
            </div>

            <h3 className="text-lg font-medium text-gray-800">
              Drop your Excel file here
            </h3>

            <p className="mt-1 text-sm text-gray-500">
              or select a file from your computer
            </p>

            <label
              htmlFor="employee-excel-upload"
              className="mt-5 cursor-pointer rounded-lg bg-blue-600 px-5 py-2.5
                   text-sm font-medium text-white transition
                   hover:bg-blue-700"
            >
              Browse File
            </label>

            <input
              id="employee-excel-upload"
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="hidden"
            />

            <p className="mt-4 text-xs text-gray-400">
              Supported formats: .xlsx, .xls
            </p>
          </div>

          {/* Error */}
          {fileError && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
              <p className="text-sm text-red-600">{fileError}</p>
            </div>
          )}

          {/* Selected File */}
          {selectedFile && employeesToAdd.length > 0 && (
            <div className="mt-6">
              {/* File information */}
              <div
                className="flex items-center justify-between rounded-lg border
                        border-gray-200 bg-gray-50 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-10 w-10 items-center justify-center
                            rounded-lg bg-green-100"
                  >
                    📄
                  </div>

                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      {selectedFile.name}
                    </p>

                    <p className="text-xs text-gray-500">
                      {employeesToAdd.length} employees found
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setSelectedFile(null);
                    setEmployeesToAdd([]);
                    setFileError("");
                  }}
                  className="text-sm font-medium text-red-500 hover:text-red-700"
                >
                  Remove
                </button>
              </div>

              {/* Preview */}
              <div className="mt-6">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-base font-semibold text-gray-800">
                    Employee Preview
                  </h3>

                  <span
                    className="rounded-full bg-blue-50 px-3 py-1 text-xs
                             font-medium text-blue-600"
                  >
                    {employeesToAdd.length} Records
                  </span>
                </div>

                <div className="overflow-hidden rounded-lg border border-gray-200">
                  <div className="max-h-80 overflow-auto">
                    <table className="w-full text-left text-sm">
                      <thead
                        className="sticky top-0 bg-gray-50 text-xs
                                  uppercase text-gray-500"
                      >
                        <tr>
                          <th className="whitespace-nowrap border-b px-4 py-3">
                            Name
                          </th>

                          <th className="whitespace-nowrap border-b px-4 py-3">
                            Email
                          </th>

                          <th className="whitespace-nowrap border-b px-4 py-3">
                            Role
                          </th>

                          <th className="whitespace-nowrap border-b px-4 py-3">
                            Status
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {employeesToAdd.map((employee, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="whitespace-nowrap border-b px-4 py-3 font-medium text-gray-800">
                              {employee.name}
                            </td>

                            <td className="whitespace-nowrap border-b px-4 py-3 text-gray-600">
                              {employee.email}
                            </td>

                            <td className="whitespace-nowrap border-b px-4 py-3">
                              {employee.role}
                            </td>

                            <td className="whitespace-nowrap border-b px-4 py-3">
                              <span
                                className={`rounded-full px-2.5 py-1 text-xs font-medium ${employee.status === "active"
                                  ? "bg-green-100 text-green-700"
                                  : "bg-gray-100 text-gray-600"
                                  }`}
                              >
                                {employee.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
              <div>
                {errors.map((e, index) => (
                  <div className="text-red-700" key={index}>
                    {e}
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="mt-6 flex justify-end gap-3 border-t pt-5">
                <button
                  onClick={() => setShowBulkModal(false)}
                  className="rounded-lg border border-gray-300 bg-white px-5 py-2.5
                       text-sm font-medium text-gray-700
                       hover:bg-gray-50"
                >
                  Cancel
                </button>

                <button
                  disabled={errors.length > 0 || fileError.length > 0}
                  onClick={(e) => handleBlukSubmit(e)}
                  className="btn btn-primary"
                >
                  Import {employeesToAdd.length} Employees
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
