import React, { useRef, useEffect } from 'react';

const CategoryChart = ({ data, onSliceClick, loading }) => {
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
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const radius = Math.min(rect.width, rect.height) / 2 - 40;

    // Colors for categories
    const colors = [
      '#3b82f6', '#ef4444', '#10b981', '#f59e0b', 
      '#8b5cf6', '#06b6d4', '#84cc16', '#f97316'
    ];

    // Calculate total
    const total = data.reduce((sum, item) => sum + item.total, 0);

    // Draw donut chart
    let currentAngle = -Math.PI / 2; // Start from top

    data.forEach((item, index) => {
      const sliceAngle = (item.total / total) * 2 * Math.PI;
      const color = colors[index % colors.length];

      // Draw slice
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
      ctx.closePath();
      ctx.fill();

      // Draw inner circle (donut effect)
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius * 0.6, 0, 2 * Math.PI);
      ctx.fill();

      currentAngle += sliceAngle;
    });

    // Draw labels
    currentAngle = -Math.PI / 2;
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';

    data.forEach((item, index) => {
      const sliceAngle = (item.total / total) * 2 * Math.PI;
      const labelAngle = currentAngle + sliceAngle / 2;
      const labelRadius = radius * 0.8;
      
      const labelX = centerX + Math.cos(labelAngle) * labelRadius;
      const labelY = centerY + Math.sin(labelAngle) * labelRadius;

      // Draw percentage
      ctx.fillStyle = '#374151';
      ctx.font = 'bold 12px Arial';
      ctx.fillText(`${item.percentage.toFixed(1)}%`, labelX, labelY);

      currentAngle += sliceAngle;
    });

    // Draw legend
    const legendX = rect.width - 150;
    const legendY = 20;
    const legendItemHeight = 20;

    data.forEach((item, index) => {
      const color = colors[index % colors.length];
      const y = legendY + index * legendItemHeight;

      // Color box
      ctx.fillStyle = color;
      ctx.fillRect(legendX, y, 12, 12);

      // Label
      ctx.fillStyle = '#374151';
      ctx.font = '11px Arial';
      ctx.textAlign = 'left';
      ctx.fillText(item.category, legendX + 18, y + 9);

      // Value
      ctx.fillStyle = '#6b7280';
      ctx.fillText(
        new Intl.NumberFormat('en-IN', { 
          style: 'currency', 
          currency: 'INR',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        }).format(item.total),
        legendX + 18,
        y + 20
      );
    });

    // Add click handlers
    const handleClick = (event) => {
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      // Calculate distance from center
      const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
      
      if (distance >= radius * 0.6 && distance <= radius) {
        // Calculate angle
        let angle = Math.atan2(y - centerY, x - centerX);
        if (angle < 0) angle += 2 * Math.PI;
        angle += Math.PI / 2; // Adjust for starting position
        if (angle >= 2 * Math.PI) angle -= 2 * Math.PI;

        // Find which slice was clicked
        let currentAngle = 0;
        for (let i = 0; i < data.length; i++) {
          const sliceAngle = (data[i].total / total) * 2 * Math.PI;
          if (angle >= currentAngle && angle <= currentAngle + sliceAngle) {
            if (onSliceClick) {
              onSliceClick({
                type: 'category',
                data: data[i],
                category: data[i].category,
                value: data[i].total
              });
            }
            break;
          }
          currentAngle += sliceAngle;
        }
      }
    };

    canvas.addEventListener('click', handleClick);

    return () => {
      canvas.removeEventListener('click', handleClick);
    };
  }, [data, onSliceClick, loading]);

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

export default CategoryChart;

