'use client';
import { useState } from 'react';
import * as XLSX from 'xlsx';
import { api } from '@/lib/api';
import { showToast } from '@/lib/toast';
import type { Employee } from '@/types';

/** Bulk import from an Excel file: read, validate, preview, then POST /employees/bulkAdd. */
export function useBulkImport(reloadEmployees: () => void) {
  const [errors, setErrors] = useState<string[]>([]);
  const [employeesToAdd, setEmployeesToAdd] = useState<Employee[]>([]);
  const [showBulkModal, setShowBulkModal] = useState<boolean>(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [fileError, setFileError] = useState("");

  const validateEmployeeData = (rows: Employee[]) => {
    const validationErrors: string[] = [];
    const role = ["intern", "employee"];
    const status = ["active", "on_leave", "onboarding"];
    rows.forEach((employee, index) => {
      const rowNumber = index + 1;
      if (!employee.name) {
        validationErrors.push(`Row ${rowNumber}: Name is required`);
      }

      if (!employee.email) {
        validationErrors.push(`Row ${rowNumber}: Email is required`);
      }

      if (!role.includes(employee.role)) {
        validationErrors.push(
          `Row ${rowNumber}: Role is invalid -- enum('intern','employee')`,
        );
      }

      if (!status.includes(employee.status)) {
        validationErrors.push(
          `Row ${rowNumber}: status is invalid -- enum('active','onboarding','on_leave') `,
        );
      }
    });
    setErrors(validationErrors);
  };

  const processExcelFile = async (file: File) => {
    setFileError("");

    const validExtensions = [".xlsx", ".xls"];
    const extension = file.name.substring(file.name.lastIndexOf("."));

    if (!validExtensions.includes(extension.toLowerCase())) {
      setFileError("Please upload an Excel file (.xlsx or .xls)");
      return;
    }

    try {
      const data = await file.arrayBuffer();

      const workbook = XLSX.read(data, {
        type: "array",
      });

      const worksheet = workbook.Sheets[workbook.SheetNames[0]];

      const rows = XLSX.utils.sheet_to_json<Employee>(worksheet);

      if (rows.length === 0) {
        setFileError("The Excel file does not contain any employees.");
        return;
      }

      setSelectedFile(file);
      validateEmployeeData(rows);
      setEmployeesToAdd(rows);
    } catch (error) {
      console.error(error);
      setFileError("Failed to read the Excel file.");
    }
  };
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (file) {
      processExcelFile(file);
    }
  };
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();

    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];

    if (file) {
      processExcelFile(file);
    }
  };
  const handleBlukSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // console.log("ca");
    if (fileError.length > 0 || errors.length > 0) return;
    try {
      await api.post("/employees/bulkAdd", {
        employeesToAdd,
      });
      // Close and clear, so reopening the modal can't import the same file twice.
      setShowBulkModal(false);
      setSelectedFile(null);
      setEmployeesToAdd([]);
      setErrors([]);
      showToast("success", "Successfully added employee");
    } catch (err) {
      showToast("error", "Failed to add employee");
    } finally {
      reloadEmployees();
    }
  };

  return {
    showBulkModal,
    setShowBulkModal,
    errors,
    employeesToAdd,
    setEmployeesToAdd,
    selectedFile,
    setSelectedFile,
    isDragging,
    setIsDragging,
    fileError,
    setFileError,
    handleFileChange,
    handleDrop,
    handleBlukSubmit,
  };
}

export type BulkImportState = ReturnType<typeof useBulkImport>;
