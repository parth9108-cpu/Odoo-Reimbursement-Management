import React, { useState } from 'react';
import { Check, X, Edit3 } from 'lucide-react';

const ReceiptOCRPanel = ({ ocrData, onConfirm, onCancel }) => {
  const [editing, setEditing] = useState({});
  const [extractedData, setExtractedData] = useState(ocrData.extracted);

  const getConfidenceColor = (confidence) => {
    if (confidence >= 80) return 'text-green-600 bg-green-100';
    if (confidence >= 50) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getConfidenceBarWidth = (confidence) => {
    return `${Math.max(confidence, 10)}%`;
  };

  const handleEdit = (field) => {
    setEditing({ ...editing, [field]: true });
  };

  const handleSave = (field, value) => {
    setExtractedData({ ...extractedData, [field]: value });
    setEditing({ ...editing, [field]: false });
  };

  const handleCancel = (field) => {
    setEditing({ ...editing, [field]: false });
  };

  const renderField = (label, field, value, confidence) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">{label}</label>
        <div className="flex items-center space-x-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getConfidenceColor(confidence)}`}>
            {confidence}%
          </span>
          <button
            onClick={() => handleEdit(field)}
            className="text-gray-400 hover:text-gray-600"
          >
            <Edit3 className="h-4 w-4" />
          </button>
        </div>
      </div>
      
      {editing[field] ? (
        <div className="flex items-center space-x-2">
          <input
            type="text"
            defaultValue={value}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleSave(field, e.target.value);
              }
            }}
            autoFocus
          />
          <button
            onClick={(e) => handleSave(field, e.target.previousSibling.value)}
            className="text-green-600 hover:text-green-800"
          >
            <Check className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleCancel(field)}
            className="text-red-600 hover:text-red-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div>
          <p className="text-sm text-gray-900">{value || 'Not detected'}</p>
          <div className="mt-1 w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full ${
                confidence >= 80 ? 'bg-green-500' : 
                confidence >= 50 ? 'bg-yellow-500' : 'bg-red-500'
              }`}
              style={{ width: getConfidenceBarWidth(confidence) }}
            ></div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Receipt Analysis</h1>
          <p className="mt-2 text-gray-600">
            Review the extracted information from your receipt. You can edit any field before confirming.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Original Image */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Original Receipt</h3>
            <div className="border rounded-lg p-4 bg-gray-50">
              <img
                src={ocrData.originalImage}
                alt="Original receipt"
                className="w-full h-auto rounded-lg shadow-sm"
              />
            </div>
            
            <h3 className="text-lg font-medium text-gray-900">Processed Image</h3>
            <div className="border rounded-lg p-4 bg-gray-50">
              <img
                src={ocrData.processedImage}
                alt="Processed receipt"
                className="w-full h-auto rounded-lg shadow-sm"
              />
            </div>
          </div>

          {/* Extracted Fields */}
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">Extracted Information</h3>
            
            <div className="bg-white border rounded-lg p-6 space-y-6">
              {renderField('Merchant', 'merchant', extractedData.merchant, extractedData.confidences.merchant)}
              {renderField('Amount', 'amount', extractedData.amount, extractedData.confidences.amount)}
              {renderField('Date', 'date', extractedData.date, extractedData.confidences.date)}
              {renderField('Category', 'category', extractedData.category, 85)}
            </div>

            {/* OCR Text */}
            <div className="bg-white border rounded-lg p-6">
              <h4 className="text-sm font-medium text-gray-900 mb-3">Raw OCR Text</h4>
              <div className="bg-gray-50 rounded-md p-3">
                <pre className="text-xs text-gray-700 whitespace-pre-wrap">
                  {ocrData.ocrText}
                </pre>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3">
              <button
                onClick={onCancel}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Cancel
              </button>
              <button
                onClick={() => onConfirm(extractedData)}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Use Extracted Data
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReceiptOCRPanel;

