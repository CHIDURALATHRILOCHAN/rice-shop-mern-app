import React, { useState, useEffect } from 'react';
import { Line, Bar } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';
import './Reports.css';

// Register Chart.js components
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend
);

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL; // Get backend URL

const Reports = () => {
    // State for Monthly Report
    const [monthlyReport, setMonthlyReport] = useState(null);
    const [monthlyStartDate, setMonthlyStartDate] = useState('');
    const [monthlyEndDate, setMonthlyEndDate] = useState('');

    // State for Today's Report (derived from monthly if date matches, or fetched separately)
    const [todayReport, setTodayReport] = useState(null);
    const [todayDate, setTodayDate] = useState('');

    // State for Max Profit Product
    const [maxProfitProduct, setMaxProfitProduct] = useState(null);
    const [maxProfitDate, setMaxProfitDate] = useState('');

    // State for Sales Trends Chart
    const [salesTrendsData, setSalesTrendsData] = useState([]);
    const [trendPeriod, setTrendPeriod] = useState('daily'); // 'daily' or 'monthly'

    // State for Product Performance Chart
    const [productPerformanceData, setProductPerformanceData] = useState([]);

    const [reportMessage, setReportMessage] = useState('');
    const [isError, setIsError] = useState(false);

    const token = localStorage.getItem('token');
    const userRole = localStorage.getItem('role');

    // Initialize dates and check permission
    useEffect(() => {
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD
        setTodayDate(todayStr); // Set current date for Today's Sales

        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

        setMonthlyStartDate(firstDayOfMonth.toISOString().split('T')[0]);
        setMonthlyEndDate(lastDayOfMonth.toISOString().split('T')[0]);

        setMaxProfitDate(todayStr); // Default max profit date to today

        if (userRole !== 'admin' && userRole !== 'manager') {
            setReportMessage("You don't have permission to view reports.");
            setIsError(true);
        }
    }, [userRole]);


    // Fetch Monthly Report whenever dates change
    useEffect(() => {
        if ((userRole === 'admin' || userRole === 'manager') && monthlyStartDate && monthlyEndDate) {
            fetchMonthlyReport();
            fetchSalesTrends(); // Fetch trends for the same monthly range
            fetchProductPerformance(); // Fetch product performance for the same monthly range
        }
    }, [monthlyStartDate, monthlyEndDate, token, userRole]);

    // Fetch Max Profit Product whenever date changes
    useEffect(() => {
        if ((userRole === 'admin' || userRole === 'manager') && maxProfitDate) {
            fetchMaxProfitProduct();
        }
    }, [maxProfitDate, token, userRole]);

    // Re-fetch trends when period changes
    useEffect(() => {
        if ((userRole === 'admin' || userRole === 'manager') && monthlyStartDate && monthlyEndDate && trendPeriod) {
            fetchSalesTrends();
        }
    }, [trendPeriod]);


    const fetchMonthlyReport = async () => {
        setReportMessage('');
        setIsError(false);
        try {
            const response = await fetch(`${BACKEND_URL}/sales/report/daily-monthly?startDate=${monthlyStartDate}&endDate=${monthlyEndDate}`, { // Updated URL
                headers: { 'x-auth-token': token }
            });
            const data = await response.json();

            if (response.ok) {
                setMonthlyReport(data);

                const currentTodayDate = new Date().toISOString().split('T')[0];
                if (data.dailyBreakdown[currentTodayDate]) {
                    setTodayReport({
                        reportDate: currentTodayDate,
                        totalSales: data.dailyBreakdown[currentTodayDate].totalSales,
                        totalProfit: data.dailyBreakdown[currentTodayDate].totalProfit,
                        totalCash: data.dailyBreakdown[currentTodayDate].totalCash,
                        totalOnline: data.dailyBreakdown[currentTodayDate].totalOnline,
                        transactions: data.dailyBreakdown[currentTodayDate].transactions
                    });
                } else {
                    setTodayReport({
                        reportDate: currentTodayDate,
                        totalSales: 0, totalProfit: 0, totalCash: 0, totalOnline: 0, transactions: []
                    });
                }

            } else {
                setReportMessage(data.msg || 'Failed to fetch monthly report.');
                setIsError(true);
                setMonthlyReport(null);
                setTodayReport(null);
            }
        } catch (err) {
            console.error('Error fetching monthly report:', err);
            setReportMessage('Network error while fetching monthly report.');
            setIsError(true);
            setMonthlyReport(null);
            setTodayReport(null);
        }
    };

    const fetchMaxProfitProduct = async () => {
        try {
            const response = await fetch(`${BACKEND_URL}/sales/report/max-profit-product?date=${maxProfitDate}`, { // Updated URL
                headers: { 'x-auth-token': token }
            });
            const data = await response.json();

            if (response.ok) {
                setMaxProfitProduct(data);
            } else {
                setReportMessage(data.msg || 'Failed to fetch max profit product.');
                setIsError(true);
                setMaxProfitProduct(null);
            }
        } catch (err) {
            console.error('Error fetching max profit product:', err);
            setReportMessage('Network error while fetching max profit product.');
            setIsError(true);
            setMaxProfitProduct(null);
        }
    };

    const fetchSalesTrends = async () => {
        try {
            const response = await fetch(`${BACKEND_URL}/sales/report/trends?period=${trendPeriod}&startDate=${monthlyStartDate}&endDate=${monthlyEndDate}`, { // Updated URL
                headers: { 'x-auth-token': token }
            });
            const data = await response.json();
            if (response.ok) {
                setSalesTrendsData(data);
            } else {
                setReportMessage(data.msg || 'Failed to fetch sales trends.');
                setIsError(true);
            }
        } catch (err) {
            console.error('Error fetching sales trends:', err);
            setReportMessage('Network error while fetching sales trends.');
            setIsError(true);
        }
    };

    const fetchProductPerformance = async () => {
        try {
            const response = await fetch(`${BACKEND_URL}/sales/report/by-product-type?startDate=${monthlyStartDate}&endDate=${monthlyEndDate}`, { // Updated URL
                headers: { 'x-auth-token': token }
            });
            const data = await response.json();
            if (response.ok) {
                setProductPerformanceData(data);
            } else {
                setReportMessage(data.msg || 'Failed to fetch product performance by type.');
                setIsError(true);
            }
        } catch (err) {
            console.error('Error fetching product performance by type:', err);
            setReportMessage('Network error while fetching product performance by type.');
            setIsError(true);
        }
    };


    const handleMonthlyDateChange = (e) => {
        if (e.target.name === 'monthlyStartDate') {
            setMonthlyStartDate(e.target.value);
        } else {
            setMonthlyEndDate(e.target.value);
        }
    };

    const handleMaxProfitDateChange = (e) => {
        setMaxProfitDate(e.target.value);
    };

    const handleTrendPeriodChange = (e) => {
        setTrendPeriod(e.target.value);
    };

    const getSalesTrendsChartData = () => {
        const labels = salesTrendsData.map(d => d._id);
        const sales = salesTrendsData.map(d => d.totalSales);
        const profits = salesTrendsData.map(d => d.totalProfit);

        return {
            labels,
            datasets: [
                {
                    label: 'Total Sales (₹)',
                    data: sales,
                    borderColor: 'rgb(75, 192, 192)',
                    backgroundColor: 'rgba(75, 192, 192, 0.5)',
                    yAxisID: 'y',
                },
                {
                    label: 'Total Profit (₹)',
                    data: profits,
                    borderColor: 'rgb(255, 99, 132)',
                    backgroundColor: 'rgba(255, 99, 132, 0.5)',
                    yAxisID: 'y1',
                },
            ],
        };
    };

    const getProductPerformanceChartData = () => {
        const labels = productPerformanceData.map(d => d._id);
        const sales = productPerformanceData.map(d => d.totalSales);
        const profits = productPerformanceData.map(d => d.totalProfit);

        return {
            labels,
            datasets: [
                {
                    label: 'Total Sales (₹)',
                    data: sales,
                    backgroundColor: 'rgba(53, 162, 235, 0.5)',
                    borderColor: 'rgb(53, 162, 235)',
                    borderWidth: 1,
                },
                {
                    label: 'Total Profit (₹)',
                    data: profits,
                    backgroundColor: 'rgba(153, 102, 255, 0.5)',
                    borderColor: 'rgb(153, 102, 255)',
                    borderWidth: 1,
                },
            ],
        };
    };


    const handleClearReports = async () => {
        if (!window.confirm('Are you sure you want to clear ALL sales and returns history? This action cannot be undone!')) {
            return;
        }

        setReportMessage('');
        setIsError(false);

        try {
            const salesResponse = await fetch(`${BACKEND_URL}/sales/clear-all`, { // Updated URL
                method: 'DELETE',
                headers: { 'x-auth-token': token }
            });
            const salesData = await salesResponse.json();
            if (!salesResponse.ok) {
                throw new Error(salesData.msg || 'Failed to clear sales history.');
            }

            const returnsResponse = await fetch(`${BACKEND_URL}/returns/clear-all`, { // Updated URL
                method: 'DELETE',
                headers: { 'x-auth-token': token }
            });
            const returnsData = await returnsResponse.json();
            if (!returnsResponse.ok) {
                throw new Error(returnsData.msg || 'Failed to clear returns history.');
            }

            setReportMessage('All sales and returns history cleared successfully!');
            setIsError(false);
            fetchMonthlyReport();
            fetchMaxProfitProduct();
            fetchSalesTrends();
            fetchProductPerformance();
        } catch (err) {
            console.error('Error clearing report history:', err);
            setReportMessage(`Failed to clear report history: ${err.message || 'An unexpected error occurred.'}`);
            setIsError(true);
        }
    };


    return (
        <div className="reports-container">
            <h2>Sales Reports</h2>

            {reportMessage && (
                <p className={`message ${isError ? 'error' : 'success'}`}>
                    {reportMessage}
                </p>
            )}

            {(userRole === 'admin' || userRole === 'manager') ? (
                <>
                    <div className="report-controls">
                        {userRole === 'admin' && (
                            <button onClick={handleClearReports} className="clear-data-button clear-reports-button">
                                Clear Report History
                            </button>
                        )}
                    </div>

                    {/* Today's Sales Section */}
                    <div className="report-section today-sales-section">
                        <h3>Today's Sales ({todayReport?.reportDate || todayDate})</h3>
                        {todayReport ? (
                            <>
                                <p>Total Sales Today: ₹{(todayReport.totalSales ?? 0).toFixed(2)}</p>
                                <p>Total Profit Today: ₹{(todayReport.totalProfit ?? 0).toFixed(2)}</p>
                                <p>Cash Sales Today: ₹{(todayReport.totalCash ?? 0).toFixed(2)}</p>
                                <p>Online Sales Today: ₹{(todayReport.totalOnline ?? 0).toFixed(2)}</p>
                                {todayReport.transactions?.length === 0 && <p>No sales recorded today.</p>}
                            </>
                        ) : (
                            <p>Loading today's sales...</p>
                        )}
                    </div>

                    {/* Monthly Sales Section */}
                    <div className="report-section monthly-sales-section">
                        <h3>Monthly Sales Overview</h3>
                        <div className="report-filter">
                            <label>Start Date:</label>
                            <input type="date" name="monthlyStartDate" value={monthlyStartDate} onChange={handleMonthlyDateChange} />
                            <label>End Date:</label>
                            <input type="date" name="monthlyEndDate" value={monthlyEndDate} onChange={handleMonthlyDateChange} />
                        </div>
                        {monthlyReport ? (
                            <>
                                <p>Total Sales for Period: ₹{(monthlyReport.totalPeriodSales ?? 0).toFixed(2)}</p>
                                <p>Total Profit for Period: ₹{(monthlyReport.totalPeriodProfit ?? 0).toFixed(2)}</p>
                                <p>Total Cash Sales: ₹{(monthlyReport.totalCashSales ?? 0).toFixed(2)}</p>
                                <p>Total Online Sales: ₹{(monthlyReport.totalOnlineSales ?? 0).toFixed(2)}</p>

                                {Object.keys(monthlyReport.dailyBreakdown).length > 0 ? (
                                    <table className="report-table">
                                        <thead>
                                            <tr>
                                                <th>Date</th>
                                                <th>Total Sales (₹)</th>
                                                <th>Total Profit (₹)</th>
                                                <th>Cash Sales (₹)</th>
                                                <th>Online Sales (₹)</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {Object.entries(monthlyReport.dailyBreakdown).map(([date, data]) => (
                                                <tr key={date}>
                                                    <td>{date}</td>
                                                    <td>{(data.totalSales ?? 0).toFixed(2)}</td>
                                                    <td>{(data.totalProfit ?? 0).toFixed(2)}</td>
                                                    <td>{(data.totalCash ?? 0).toFixed(2)}</td>
                                                    <td>{(data.totalOnline ?? 0).toFixed(2)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                ) : (
                                    <p>No sales recorded for the selected date range.</p>
                                )}
                            </>
                        ) : (
                            <p>Loading monthly report...</p>
                        )}
                    </div>

                    {/* Max Profit Product Section */}
                    <div className="report-section max-profit-section">
                        <h3>Max Profit Product on Selected Day</h3>
                        <div className="report-filter">
                            <label>Select Date:</label>
                            <input type="date" name="maxProfitDate" value={maxProfitDate} onChange={handleMaxProfitDateChange} />
                        </div>
                        {maxProfitProduct === null ? (
                            <p>No sales or profit recorded on this day, or loading...</p>
                        ) : (
                            <div className="max-profit-details">
                                <h4>Product: {maxProfitProduct.productName}</h4>
                                <p>Total Profit: ₹{(maxProfitProduct.totalProfit ?? 0).toFixed(2)}</p>
                                <p>Total Quantity Sold: {(maxProfitProduct.totalQuantitySoldKg ?? 0).toFixed(2)} kg</p>
                                <p>Total Revenue: ₹{(maxProfitProduct.totalRevenue ?? 0).toFixed(2)}</p>
                            </div>
                        )}
                    </div>

                    {/* Sales Trends Chart Section */}
                    <div className="report-section sales-trends-section">
                        <h3>Sales Trends</h3>
                        <div className="chart-controls">
                            <label>View by:</label>
                            <select value={trendPeriod} onChange={handleTrendPeriodChange}>
                                <option value="daily">Daily</option>
                                <option value="monthly">Monthly</option>
                            </select>
                        </div>
                        {salesTrendsData.length > 0 ? (
                            <Line options={{ responsive: true, interaction: { mode: 'index', intersect: false }, stacked: false, plugins: { title: { display: true, text: 'Sales & Profit Trends' } }, scales: { y: { type: 'linear', display: true, position: 'left', title: { display: true, text: 'Sales (₹)' } }, y1: { type: 'linear', display: true, position: 'right', backgroundColor: 'rgba(255, 99, 132, 0.2)', grid: { drawOnChartArea: false }, title: { display: true, text: 'Profit (₹)' } } } }} data={getSalesTrendsChartData()} />
                        ) : (
                            <p>No sales data to display trends for the selected period.</p>
                        )}
                    </div>

                    {/* Product Performance Breakdown Chart Section */}
                    <div className="report-section product-performance-section">
                        <h3>Product Performance by Type</h3>
                        {productPerformanceData.length > 0 ? (
                            <Bar options={{ responsive: true, plugins: { legend: { position: 'top' }, title: { display: true, text: 'Sales & Profit by Product Type' } } }} data={getProductPerformanceChartData()} />
                        ) : (
                            <p>No product performance data to display for the selected period.</p>
                        )}
                    </div>
                </>
            ) : (
                <p className="unauthorized-message">You do not have permission to view reports.</p>
            )}
        </div>
    );
};

export default Reports;