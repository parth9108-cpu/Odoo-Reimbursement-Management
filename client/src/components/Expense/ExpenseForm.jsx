import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic, MicOff, Upload, Camera } from 'lucide-react';
import { expensesAPI } from '../../services/api';
import { parseTranscript, speak } from '../../utils/voice';
import { runOCR, extractFields, categorizeExpense } from '../../utils/ocr';
import { preprocessImage, resizeImage } from '../../utils/preprocess';
import ReceiptOCRPanel from './ReceiptOCRPanel';

const ExpenseForm = ({ user }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    amount: '',
    currency: 'INR',
    category: '',
    description: '',
    date: new Date().toISOString().split('T')[0]
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState(null);
  const [showOCRPanel, setShowOCRPanel] = useState(false);
  const [ocrData, setOcrData] = useState(null);
  const [transcript, setTranscript] = useState('');

  const categories = [
    'Food & Dining',
    'Travel & Transport',
    'Lodging',
    'Office Supplies',
    'Entertainment',
    'Others'
  ];

  React.useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        speak('Listening...');
      };

      recognition.onresult = (event) => {
        const rawTranscript = event.results[0][0].transcript;
        setTranscript(rawTranscript);
        const parsed = parseTranscript(rawTranscript);
        
        setFormData(prev => ({
          ...prev,
          amount: parsed.amount || prev.amount,
          category: parsed.category || prev.category,
          date: parsed.date ? parsed.date.toISOString().split('T')[0] : prev.date,
          description: parsed.description || rawTranscript
        }));
        
        speak('Expense details captured');
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        speak('Sorry, I could not understand');
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      setRecognition(recognition);
    }
  }, []);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const startListening = () => {
    if (recognition && !isListening) {
      recognition.start();
    }
  };

  const stopListening = () => {
    if (recognition && isListening) {
      recognition.stop();
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setLoading(true);
      
      // Resize and preprocess image
      const resizedImage = await resizeImage(file);
      const processedImage = await preprocessImage(resizedImage);
      
      // Run OCR
      const ocrResult = await runOCR(processedImage);
      const extracted = extractFields(ocrResult.text, ocrResult.words);
      const categorized = categorizeExpense(extracted.merchant, formData.description);
      
      setOcrData({
        originalImage: URL.createObjectURL(file),
        processedImage: URL.createObjectURL(processedImage),
        extracted: {
          ...extracted,
          category: categorized.category
        },
        ocrText: ocrResult.text
      });
      
      setShowOCRPanel(true);
    } catch (error) {
      console.error('OCR Error:', error);
      setError('Failed to process receipt image');
    } finally {
      setLoading(false);
    }
  };

  const handleOCRConfirm = (extractedData) => {
    setFormData(prev => ({
      ...prev,
      amount: extractedData.amount || prev.amount,
      category: extractedData.category || prev.category,
      description: extractedData.merchant || prev.description
    }));
    setShowOCRPanel(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const expenseData = {
        ...formData,
        amountOriginal: parseFloat(formData.amount),
        currencyOriginal: formData.currency,
        extractedFields: ocrData ? ocrData.extracted : null
      };

      await expensesAPI.createExpense(expenseData);
      navigate('/expenses');
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to create expense');
    } finally {
      setLoading(false);
    }
  };

  if (showOCRPanel && ocrData) {
    return (
      <ReceiptOCRPanel
        ocrData={ocrData}
        onConfirm={handleOCRConfirm}
        onCancel={() => setShowOCRPanel(false)}
      />
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Add New Expense</h1>
          <p className="mt-2 text-gray-600">
            Create a new expense entry using manual input, voice command, or receipt upload.
          </p>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          {error && (
            <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Voice Input Section */}
            <div className="border-b pb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Voice Input
              </h3>
              <div className="flex items-center space-x-4">
                <button
                  type="button"
                  onClick={isListening ? stopListening : startListening}
                  className={`flex items-center px-4 py-2 rounded-md text-white ${
                    isListening 
                      ? 'bg-red-500 hover:bg-red-600' 
                      : 'bg-blue-500 hover:bg-blue-600'
                  }`}
                >
                  {isListening ? (
                    <>
                      <MicOff className="h-4 w-4 mr-2" />
                      Stop Listening
                    </>
                  ) : (
                    <>
                      <Mic className="h-4 w-4 mr-2" />
                      Start Voice Input
                    </>
                  )}
                </button>
                <p className="text-sm text-gray-500">
                  Say: "Add ₹500 lunch expense today"
                </p>
              </div>
            </div>

            {/* Receipt Upload Section */}
            <div className="border-b pb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Receipt Upload
              </h3>
              <div className="flex items-center space-x-4">
                <label className="flex items-center px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-md cursor-pointer">
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Receipt
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
                <p className="text-sm text-gray-500">
                  Upload a receipt image for automatic field extraction
                </p>
              </div>
            </div>

            {/* Manual Form Fields */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Manual Entry
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="amount" className="block text-sm font-medium text-gray-700">
                    Amount *
                  </label>
                  <div className="mt-1 flex rounded-md shadow-sm">
                    <select
                      name="currency"
                      value={formData.currency}
                      onChange={handleChange}
                      className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm"
                    >
                      <option value="INR">₹</option>
                      <option value="USD">$</option>
                      <option value="EUR">€</option>
                    </select>
                    <input
                      type="number"
                      name="amount"
                      id="amount"
                      required
                      step="0.01"
                      className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-r-md border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      placeholder="0.00"
                      value={formData.amount}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="category" className="block text-sm font-medium text-gray-700">
                    Category *
                  </label>
                  <select
                    id="category"
                    name="category"
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    value={formData.category}
                    onChange={handleChange}
                  >
                    <option value="">Select a category</option>
                    {categories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="date" className="block text-sm font-medium text-gray-700">
                    Date *
                  </label>
                  <input
                    type="date"
                    name="date"
                    id="date"
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    value={formData.date}
                    onChange={handleChange}
                  />
                </div>

                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                    Description *
                  </label>
                  <input
                    type="text"
                    name="description"
                    id="description"
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="Brief description of the expense"
                    value={formData.description}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => navigate('/expenses')}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create Expense'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ExpenseForm;

