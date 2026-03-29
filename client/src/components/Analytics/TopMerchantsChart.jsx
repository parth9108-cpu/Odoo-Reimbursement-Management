import React, { useRef, useEffect } from 'react';

const TopMerchantsChart = ({ data, onBarClick, loading }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!data || data.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    
    // Set canvas size
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    
    // Clear canvas
    ctx.clearRect(0, 0, rect.width, rect.height);

    if (loading) {
      // Draw loading animation
      ctx.fillStyle = '#f3f4f6';
      ctx.fillRect(0, 0, rect.width, rect.height);
      ctx.fillStyle = '#6b7280';
      ctx.font = '16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Loading...', rect.width / 2, rect.height / 2);
      return;
    }

    // Chart dimensions
    const margin = { top: 20, right: 40, bottom: 60, left: 120 };
    const width = rect.width - margin.left - margin.right;
    const height = rect.height - margin.top - margin.bottom;

    // Find max value
    const maxValue = Math.max(...data.map(d => d.total));

    // Create scales
    const xScale = (value) => {
      return margin.left + (value / maxValue) * width;
    };

    const yScale = (index) => {
      const barHeight = height / data.length;
      return margin.top + index * barHeight + barHeight * 0.2;
    };

    const barHeight = (height / data.length) * 0.6;

    // Draw bars
    data.forEach((merchant, index) => {
      const x = margin.left;
      const y = yScale(index);
      const barWidth = xScale(merchant.total) - margin.left;

      // Bar background
      ctx.fillStyle = '#e5e7eb';
      ctx.fillRect(x, y, width, barHeight);

      // Bar fill
      const gradient = ctx.createLinearGradient(x, y, x + barWidth, y);
      gradient.addColorStop(0, '#3b82f6');
      gradient.addColorStop(1, '#1d4ed8');
      ctx.fillStyle = gradient;
      ctx.fillRect(x, y, barWidth, barHeight);

      // Merchant name
      ctx.fillStyle = '#374151';
      ctx.font = '12px Arial';
      ctx.textAlign = 'right';
      ctx.fillText(merchant.merchant, margin.left - 10, y + barHeight / 2 + 4);

      // Value
      ctx.fillStyle = '#6b7280';
      ctx.font = '11px Arial';
      ctx.textAlign = 'left';
      ctx.fillText(
        new Intl.NumberFormat('en-IN', { 
          style: 'currency', 
          currency: 'INR',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        }).format(merchant.total),
        x + barWidth + 10,
        y + barHeight / 2 + 4
      );

      // Count
      ctx.fillStyle = '#9ca3af';
      ctx.font = '10px Arial';
      ctx.fillText(
        `${merchant.count} receipts`,
        x + barWidth + 10,
        y + barHeight / 2 + 16
      );
    });

    // Draw axes
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;

    // Y-axis
    ctx.beginPath();
    ctx.moveTo(margin.left, margin.top);
    ctx.lineTo(margin.left, margin.top + height);
    ctx.stroke();

    // X-axis
    ctx.beginPath();
    ctx.moveTo(margin.left, margin.top + height);
    ctx.lineTo(margin.left + width, margin.top + height);
    ctx.stroke();

    // Draw grid lines
    ctx.strokeStyle = '#f3f4f6';
    ctx.lineWidth = 1;

    for (let i = 0; i <= 5; i++) {
      const value = (maxValue * i) / 5;
      const x = xScale(value);
      ctx.beginPath();
      ctx.moveTo(x, margin.top);
      ctx.lineTo(x, margin.top + height);
      ctx.stroke();
    }

    // X-axis labels
    ctx.fillStyle = '#6b7280';
    ctx.font = '11px Arial';
    ctx.textAlign = 'center';

    for (let i = 0; i <= 5; i++) {
      const value = (maxValue * i) / 5;
      const x = xScale(value);
      ctx.fillText(
        new Intl.NumberFormat('en-IN', { 
          style: 'currency', 
          currency: 'INR',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        }).format(value),
        x,
        margin.top + height + 20
      );
    }

    // Add click handlers
    const handleClick = (event) => {
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      // Check if click is within chart area
      if (x >= margin.left && x <= margin.left + width && 
          y >= margin.top && y <= margin.top + height) {
        
        // Find which bar was clicked
        const clickedIndex = Math.floor((y - margin.top) / (height / data.length));
        
        if (clickedIndex >= 0 && clickedIndex < data.length) {
          const merchant = data[clickedIndex];
          if (onBarClick) {
            onBarClick({
              type: 'merchant',
              data: merchant,
              merchant: merchant.merchant,
              value: merchant.total
            });
          }
        }
      }
    };

    canvas.addEventListener('click', handleClick);

    return () => {
      canvas.removeEventListener('click', handleClick);
    };
  }, [data, onBarClick, loading]);

  return (
    <div className="w-full h-80">
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-pointer"
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
};

export default TopMerchantsChart;

