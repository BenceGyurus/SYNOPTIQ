"use client";

import { useState, useEffect } from 'react';

interface Inverter {
  id: number;
  name: string;
  serial_number: string;
  ip_address: string;
  port: number;
}

interface InverterFormData {
  name: string;
  serial_number: string;
  ip_address: string;
  port: number;
}

interface Props {
  inverter?: Inverter | null;
  onSave: (data: InverterFormData, id?: number) => void;
  onClose: () => void;
}

export default function InverterFormModal({ inverter, onSave, onClose }: Props) {
  const [formData, setFormData] = useState<InverterFormData>({
    name: '',
    serial_number: '',
    ip_address: '',
    port: 8484,
  });

  useEffect(() => {
    if (inverter) {
      setFormData({
        name: inverter.name,
        serial_number: inverter.serial_number,
        ip_address: inverter.ip_address,
        port: inverter.port,
      });
    } else {
      setFormData({ name: '', serial_number: '', ip_address: '', port: 8484 });
    }
  }, [inverter]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseInt(value, 10) : value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData, inverter?.id);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
          {inverter ? 'Edit Inverter' : 'Add New Inverter'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Name</label>
            <input type="text" name="name" id="name" value={formData.name} onChange={handleChange} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
          </div>
          <div>
            <label htmlFor="serial_number" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Serial Number</label>
            <input type="text" name="serial_number" id="serial_number" value={formData.serial_number} onChange={handleChange} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
          </div>
          <div>
            <label htmlFor="ip_address" className="block text-sm font-medium text-gray-700 dark:text-gray-300">IP Address</label>
            <input type="text" name="ip_address" id="ip_address" value={formData.ip_address} onChange={handleChange} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
          </div>
          <div>
            <label htmlFor="port" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Port</label>
            <input type="number" name="port" id="port" value={formData.port} onChange={handleChange} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
          </div>
          <div className="flex justify-end space-x-2 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600">
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700">
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
