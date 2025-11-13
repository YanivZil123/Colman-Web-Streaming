/**
 * Client-side script for statistics dashboard
 * Fetches daily watch data via AJAX and initializes Chart.js visualization
 */

let dailyWatchChart = null;

/**
 * Fetch aggregated watch data and draw a Chart.js bar chart
 * Transforms raw data into chart-compatible format
 */
async function fetchAndDrawChart() {
    const loadingSpinner = document.getElementById('loadingSpinner');
    const errorMessage = document.getElementById('errorMessage');
    const canvasContainer = document.getElementById('dailyWatchChart');
    const noDataMessage = document.getElementById('noDataMessage');
    const statsInfo = document.getElementById('statsInfo');

    try {
        // Show loading state
        loadingSpinner.style.display = 'flex';
        errorMessage.classList.remove('show');
        canvasContainer.style.display = 'none';
        noDataMessage.style.display = 'none';
        statsInfo.style.display = 'none';

        // Fetch data from API
        const response = await fetch('/api/stats/daily-watch', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            if (response.status === 403) {
                throw new Error('Access denied. Admin privileges required.');
            }
            throw new Error(`API request failed with status ${response.status}`);
        }

        const responseData = await response.json();
        
        if (!responseData.success || !responseData.data) {
            throw new Error('Invalid response format from API');
        }

        const data = responseData.data;

        // Handle empty data
        if (!data || data.length === 0) {
            loadingSpinner.style.display = 'none';
            noDataMessage.style.display = 'block';
            return;
        }

        // Transform data for Chart.js
        const chartData = transformDataForChart(data);

        // Hide loading spinner
        loadingSpinner.style.display = 'none';
        canvasContainer.style.display = 'block';
        statsInfo.style.display = 'block';

        // Update stats info
        document.getElementById('totalRecords').textContent = data.length;
        document.getElementById('loadedTime').textContent = new Date().toLocaleString();

        // Initialize or update chart
        initializeChart(chartData);

    } catch (error) {
        console.error('Error fetching watch data:', error);
        loadingSpinner.style.display = 'none';
        errorMessage.textContent = `Error: ${error.message}`;
        errorMessage.classList.add('show');
    }
}

/**
 * Transform raw aggregated data into Chart.js compatible format
 * Groups data by profile name for distinct datasets
 * 
 * @param {Array} rawData - Array of objects with profileId, profileName, date, totalWatchedDuration
 * @returns {Object} Transformed data with labels and datasets
 */
function transformDataForChart(rawData) {
    // Extract unique dates and profile names, and sort them
    const datesSet = new Set();
    const profilesSet = new Set();
    
    rawData.forEach(item => {
        datesSet.add(item.date);
        // Create unique profile identifier using username and profile name
        const profileLabel = `${item.username} - ${item.profileName}`;
        profilesSet.add(profileLabel);
    });

    const dates = Array.from(datesSet).sort();
    const profiles = Array.from(profilesSet).sort();

    // Create a map for quick data lookup
    const dataMap = {};
    rawData.forEach(item => {
        const profileLabel = `${item.username} - ${item.profileName}`;
        const key = `${profileLabel}-${item.date}`;
        dataMap[key] = item.totalWatchedDuration || 0;
    });

    // Generate datasets for each profile
    const colors = generateUserColors(profiles.length);
    const datasets = profiles.map((profileLabel, index) => {
        const data = dates.map(date => {
            const key = `${profileLabel}-${date}`;
            return dataMap[key] || 0;
        });

        return {
            label: profileLabel,
            data: data,
            backgroundColor: colors[index].bg,
            borderColor: colors[index].border,
            borderWidth: 1,
            borderRadius: 4,
            tension: 0.1
        };
    });

    return {
        labels: dates,
        datasets: datasets
    };
}

/**
 * Generate color palette for chart datasets
 * 
 * @param {Number} count - Number of colors needed
 * @returns {Array} Array of color objects with bg and border
 */
function generateUserColors(count) {
    const baseColors = [
        { bg: 'rgba(0, 214, 232, 0.7)', border: 'rgba(0, 214, 232, 1)' },      // Disney cyan
        { bg: 'rgba(255, 85, 100, 0.7)', border: 'rgba(255, 85, 100, 1)' },    // Red
        { bg: 'rgba(139, 92, 246, 0.7)', border: 'rgba(139, 92, 246, 1)' },    // Purple
        { bg: 'rgba(34, 197, 94, 0.7)', border: 'rgba(34, 197, 94, 1)' },      // Green
        { bg: 'rgba(249, 115, 22, 0.7)', border: 'rgba(249, 115, 22, 1)' },    // Orange
        { bg: 'rgba(59, 130, 246, 0.7)', border: 'rgba(59, 130, 246, 1)' },    // Blue
        { bg: 'rgba(236, 72, 153, 0.7)', border: 'rgba(236, 72, 153, 1)' },    // Pink
        { bg: 'rgba(168, 85, 247, 0.7)', border: 'rgba(168, 85, 247, 1)' },    // Indigo
    ];

    const colors = [];
    for (let i = 0; i < count; i++) {
        colors.push(baseColors[i % baseColors.length]);
    }
    return colors;
}

/**
 * Initialize Chart.js bar chart
 * 
 * @param {Object} chartData - Transformed data with labels and datasets
 */
function initializeChart(chartData) {
    const ctx = document.getElementById('dailyWatchChart').getContext('2d');

    // Destroy existing chart if it exists
    if (dailyWatchChart) {
        dailyWatchChart.destroy();
    }

    // Create new chart
    dailyWatchChart = new Chart(ctx, {
        type: 'bar',
        data: chartData,
        options: {
            responsive: true,
            maintainAspectRatio: true,
            indexAxis: 'x',
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        color: 'rgba(255, 255, 255, 0.8)',
                        font: {
                            size: 12,
                            weight: '500'
                        },
                        padding: 15,
                        usePointStyle: true
                    }
                },
                title: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: 'rgba(255, 255, 255, 1)',
                    bodyColor: 'rgba(255, 255, 255, 0.9)',
                    borderColor: 'rgba(0, 214, 232, 0.5)',
                    borderWidth: 1,
                    padding: 12,
                    displayColors: true,
                    callbacks: {
                        label: function(context) {
                            const duration = context.parsed.y;
                            const hours = Math.floor(duration / 3600);
                            const minutes = Math.floor((duration % 3600) / 60);
                            const seconds = duration % 60;
                            
                            let durationString = '';
                            if (hours > 0) durationString += `${hours}h `;
                            if (minutes > 0) durationString += `${minutes}m `;
                            if (seconds > 0 || !durationString) durationString += `${Math.round(seconds)}s`;
                            
                            return `${context.dataset.label}: ${durationString.trim()}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    display: true,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.05)',
                        drawBorder: true,
                        drawTicks: true
                    },
                    ticks: {
                        color: 'rgba(255, 255, 255, 0.7)',
                        font: {
                            size: 11
                        }
                    },
                    stacked: false
                },
                y: {
                    display: true,
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.05)',
                        drawBorder: true,
                        drawTicks: true
                    },
                    ticks: {
                        color: 'rgba(255, 255, 255, 0.7)',
                        font: {
                            size: 11
                        },
                        callback: function(value) {
                            const hours = Math.floor(value / 3600);
                            const minutes = Math.floor((value % 3600) / 60);
                            
                            if (hours > 0) {
                                return `${hours}h`;
                            }
                            if (minutes > 0) {
                                return `${minutes}m`;
                            }
                            return `${value}s`;
                        }
                    },
                    title: {
                        display: true,
                        text: 'Watch Duration (seconds)'
                    }
                }
            }
        }
    });
}
