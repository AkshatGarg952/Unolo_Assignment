import { useState, useEffect } from 'react';
import api from '../utils/api';

function Reports() {
    // Default to today in IST
    const [date, setDate] = useState(() => {
        return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    });
    const [reportData, setReportData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchReport = async (selectedDate) => {
        setLoading(true);
        setError(null);
        try {
            const response = await api.get(`/reports/daily-summary`, {
                params: { date: selectedDate }
            });
            setReportData(response.data.data);
        } catch (err) {
            console.error('Failed to fetch report:', err);
            setError(err.response?.data?.message || 'Failed to load report. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (date) {
            fetchReport(date);
        }
    }, [date]);

    const handleDateChange = (e) => {
        setDate(e.target.value);
    };

    return (
        <div className="space-y-6">
            <header className="flex justify-between items-center bg-white p-4 rounded-lg shadow">
                <h1 className="text-2xl font-bold text-gray-800">Daily Summary Report</h1>
                <div className="flex items-center space-x-2">
                    <label htmlFor="date" className="text-sm font-medium text-gray-700">Date:</label>
                    <input
                        type="date"
                        id="date"
                        value={date}
                        onChange={handleDateChange}
                        className="block rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                    />
                </div>
            </header>

            {loading && (
                <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
            )}

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
                    <strong className="font-bold">Error: </strong>
                    <span className="block sm:inline">{error}</span>
                </div>
            )}

            {!loading && reportData && (
                <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-white p-6 rounded-lg shadow">
                            <h3 className="text-sm font-medium text-gray-500">Total Check-ins</h3>
                            <p className="mt-2 text-3xl font-semibold text-gray-900">{reportData.team_summary.total_checkins}</p>
                        </div>
                        <div className="bg-white p-6 rounded-lg shadow">
                            <h3 className="text-sm font-medium text-gray-500">Total Hours</h3>
                            <p className="mt-2 text-3xl font-semibold text-blue-600">{reportData.team_summary.total_hours}h</p>
                        </div>
                        <div className="bg-white p-6 rounded-lg shadow">
                            <h3 className="text-sm font-medium text-gray-500">Active Employees</h3>
                            <p className="mt-2 text-3xl font-semibold text-green-600">{reportData.team_summary.active_employees}</p>
                        </div>
                        <div className="bg-white p-6 rounded-lg shadow">
                            <h3 className="text-sm font-medium text-gray-500">Unique Clients</h3>
                            <p className="mt-2 text-3xl font-semibold text-purple-600">{reportData.team_summary.total_unique_clients}</p>
                        </div>
                    </div>

                    {/* Employee Breakdown Table */}
                    <div className="bg-white shadow rounded-lg overflow-hidden">
                        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
                            <h3 className="text-lg leading-6 font-medium text-gray-900">Employee Breakdown</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check-ins</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Clients Visited</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hours Worked</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {reportData.employee_breakdown.length > 0 ? (
                                        reportData.employee_breakdown.map((emp) => (
                                            <tr key={emp.employee_id}>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{emp.employee_name}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{emp.total_checkins}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{emp.clients_visited_count}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">{emp.total_hours}h</td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="4" className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">No activity found for this date.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

export default Reports;
