'use client';
import { useState } from 'react';
import { api } from '@/lib/api';
import { showToast } from '@/lib/toast';

/** The single "Add Employee" modal. Its form keeps its values when the modal is closed and reopened. */
export function useAddEmployee(reloadEmployees: () => void) {
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    designation: "",
    department: "",
    manager_id: "",
    start_date: "",
    role: "employee",
    status: "active",
  });

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    try {
      await api.post("/employees", {
        ...form,
        manager_id: form.manager_id ? parseInt(form.manager_id) : null,
      });
      setShowModal(false);
      showToast("success", "Successfully added employee");
    } catch (err) {
      showToast("error", "Failed to add employee");
    } finally {
      reloadEmployees();
    }
  };

  return {
    showModal,
    setShowModal,
    form,
    setForm,
    submit,
  };
}

export type AddEmployeeState = ReturnType<typeof useAddEmployee>;
