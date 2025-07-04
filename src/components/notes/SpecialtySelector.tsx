import React from 'react';
import { SpecialtyBase } from '../../types';

interface SpecialtySelectorProps {
  specialties: SpecialtyBase[];
  selectedSpecialtyId: string;
  onSpecialtyChange: (specialtyId: string) => void;
  className?: string;
}

const SpecialtySelector: React.FC<SpecialtySelectorProps> = ({
  specialties,
  selectedSpecialtyId,
  onSpecialtyChange,
  className = '',
}) => {
  return (
    <div className={`mb-4 md:mb-6 ${className}`}>
      <label htmlFor="specialty-select" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
        Seleccionar Especialidad
      </label>
      <select
        id="specialty-select"
        value={selectedSpecialtyId}
        onChange={(e) => onSpecialtyChange(e.target.value)}
        className="block w-full pl-3 pr-10 py-2.5 text-sm md:text-base border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary rounded-md shadow-sm transition-colors"
      >
        {specialties.map((spec) => (
          <option key={spec.id} value={spec.id}>
            {spec.name}
          </option>
        ))}
      </select>
    </div>
  );
};

export default SpecialtySelector;