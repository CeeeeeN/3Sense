import React, { useState } from "react";
import { IconAdd, IconX } from "./Icons";

export default function FormBuilder({ fields, onChange }) {
  const [showOptions, setShowOptions] = useState(false);

  const addField = (type) => {
    const newField = { id: Date.now(), label: "", type, required: true };
    onChange([...fields, newField]);
    setShowOptions(false);
  };

  const updateField = (id, key, value) => {
    onChange(fields.map(f => f.id === id ? { ...f, [key]: value } : f));
  };

  const removeField = (id) => {
    onChange(fields.filter(f => f.id !== id));
  };

  return (
    <div style={{ marginTop: '20px', borderTop: '1px solid #e5e7eb', paddingTop: '16px' }}>
      <h3 style={{ fontSize: '1rem', marginBottom: '8px' }}>Custom Response Form Builder</h3>
      <p style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '16px' }}>Add dynamic form inputs. Residents MUST answer these when submitting requests or registering.</p>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
        {fields.map((f, index) => (
          <div key={f.id} style={{ display: 'flex', gap: '12px', alignItems: 'center', background: '#f9fafb', padding: '12px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
            <span style={{ fontWeight: 'bold', color: '#9ca3af' }}>{index + 1}.</span>
            <input 
              className="as-form-input" 
              style={{ flex: 1, margin: 0 }} 
              placeholder="E.g. Spouse Name, CTC Number..." 
              value={f.label} 
              onChange={(e) => updateField(f.id, 'label', e.target.value)} 
            />
            <select className="as-form-select" style={{ width: '140px', margin: 0 }} value={f.type} onChange={(e) => updateField(f.id, 'type', e.target.value)}>
              <option value="text">Short Text</option>
              <option value="number">Number</option>
              <option value="date">Date</option>
              <option value="checkbox">Checkbox</option>
              <option value="file">File Upload</option>
            </select>
            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem' }}>
              <input type="checkbox" checked={f.required} onChange={(e) => updateField(f.id, 'required', e.target.checked)} />
              Required
            </label>
            <button type="button" onClick={() => removeField(f.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}>
              <IconX />
            </button>
          </div>
        ))}
      </div>

      <div style={{ position: 'relative' }}>
        <button type="button" className="as-btn-ghost" onClick={() => setShowOptions(!showOptions)}>
          <IconAdd /> Add Custom Field
        </button>
        {showOptions && (
          <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: '4px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', padding: '8px', zIndex: 10, display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '150px' }}>
            <button type="button" style={{ textAlign: 'left', background: '#f9fafb', border: '1px solid #e5e7eb', padding: '8px 12px', cursor: 'pointer', borderRadius: '4px' }} onClick={() => addField("text")}>Text Input</button>
            <button type="button" style={{ textAlign: 'left', background: '#f9fafb', border: '1px solid #e5e7eb', padding: '8px 12px', cursor: 'pointer', borderRadius: '4px' }} onClick={() => addField("number")}>Number Input</button>
            <button type="button" style={{ textAlign: 'left', background: '#f9fafb', border: '1px solid #e5e7eb', padding: '8px 12px', cursor: 'pointer', borderRadius: '4px' }} onClick={() => addField("date")}>Date Picker</button>
            <button type="button" style={{ textAlign: 'left', background: '#f9fafb', border: '1px solid #e5e7eb', padding: '8px 12px', cursor: 'pointer', borderRadius: '4px' }} onClick={() => addField("checkbox")}>Checkbox / Consent</button>
            <button type="button" style={{ textAlign: 'left', background: '#f9fafb', border: '1px solid #e5e7eb', padding: '8px 12px', cursor: 'pointer', borderRadius: '4px' }} onClick={() => addField("file")}>File Upload</button>
          </div>
        )}
      </div>
    </div>
  );
}
