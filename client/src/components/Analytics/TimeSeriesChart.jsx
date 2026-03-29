import React, { useRef, useEffect } from 'react';

const TimeSeriesChart = ({ data, onPointClick, loading }) => {
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
    const margin = { top: 20, right: 40, bottom: 40, left: 60 };
    const width = rect.width - margin.left - margin.right;
    const height = rect.height - margin.top - margin.bottom;

    // Find min/max values
    const maxValue = Math.max(...data.map(d => d.total));
    const minValue = Math.min(...data.map(d => d.total));
    const valueRange = maxValue - minValue;

    // Create scales
    const xScale = (date) => {
      const dateRange = new Date(data[data.length - 1].date) - new Date(data[0].date);
      return margin.left + ((new Date(date) - new Date(data[0].date)) / dateRange) * width;
    };

    const yScale = (value) => {
      return margin.top + height - ((value - minValue) / valueRange) * height;
    };

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

    // Y-axis grid lines
    for (let i = 0; i <= 5; i++) {
      const value = minValue + (valueRange * i / 5);
      const y = yScale(value);
      ctx.beginPath();
      ctx.moveTo(margin.left, y);
      ctx.lineTo(margin.left + width, y);
      ctx.stroke();
    }

    // Draw line chart
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 3;
    ctx.beginPath();

    data.forEach((point, index) => {
      const x = xScale(point.date);
      const y = yScale(point.total);
      
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();

    // Draw area under the line
    ctx.fillStyle = 'rgba(59, 130, 246, 0.1)';
    ctx.beginPath();
    ctx.moveTo(xScale(data[0].date), margin.top + height);
    
    data.forEach(point => {
      const x = xScale(point.date);
      const y = yScale(point.total);
      ctx.lineTo(x, y);
    });
    
    ctx.lineTo(xScale(data[data.length - 1].date), margin.top + height);
    ctx.closePath();
    ctx.fill();

    // Draw data points
    ctx.fillStyle = '#3b82f6';
    data.forEach(point => {
      const x = xScale(point.date);
      const y = yScale(point.total);
      
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, 2 * Math.PI);
      ctx.fill();
    });

    // Draw labels
    ctx.fillStyle = '#6b7280';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';

    // Y-axis labels
    for (let i = 0; i <= 5; i++) {
      const value = minValue + (valueRange * i / 5);
      const y = yScale(value);
      ctx.fillText(
        new Intl.NumberFormat('en-IN', { 
          style: 'currency', 
          currency: 'INR',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        }).format(value),
        margin.left - 10,
        y + 4
      );
    }

    // X-axis labels (show every 3rd date)
    data.forEach((point, index) => {
      if (index % Math.ceil(data.length / 6) === 0) {
        const x = xScale(point.date);
        const date = new Date(point.date);
        ctx.fillText(
          date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
          x,
          margin.top + height + 20
        );
      }
    });

    // Add click handlers
    const handleClick = (event) => {
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      // Find closest point
      let closestPoint = null;
      let minDistance = Infinity;

      data.forEach(point => {
        const pointX = xScale(point.date);
        const pointY = yScale(point.total);
        const distance = Math.sqrt((x - pointX) ** 2 + (y - pointY) ** 2);
        
        if (distance < minDistance && distance < 20) {
          minDistance = distance;
          closestPoint = point;
        }
      });

      if (closestPoint && onPointClick) {
        onPointClick({
          type: 'timeseries',
          data: closestPoint,
          date: closestPoint.date,
          value: closestPoint.total
        });
      }
    };

    canvas.addEventListener('click', handleClick);

    return () => {
      canvas.removeEventListener('click', handleClick);
    };
  }, [data, onPointClick, loading]);

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

export default TimeSeriesChart;

