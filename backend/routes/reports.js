const express = require('express');
const pool = require('../config/database');
const { authenticateToken, requireManager } = require('../middleware/auth');

const router = express.Router();

// Get daily summary report
router.get('/daily-summary', authenticateToken, requireManager, async (req, res) => {
    try {
        const { date, employee_id } = req.query;

        // Validate date
        if (!date) {
            return res.status(400).json({ success: false, message: 'Date parameter is required (YYYY-MM-DD)' });
        }
        
        // Basic date format validation YYYY-MM-DD
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(date)) {
            return res.status(400).json({ success: false, message: 'Invalid date format. Use YYYY-MM-DD' });
        }

        // Base query conditions
        let queryParams = [req.user.id, date]; // manager_id, date
        let employeeFilter = '';
        
        if (employee_id) {
            employeeFilter = 'AND u.id = ?';
            queryParams.push(employee_id);
        }

        // Get employee statistics
        // We calculate hours only for completed checkins (where checkout_time is not null)
        const [employeeStats] = await pool.execute(`
            SELECT 
                u.id as employee_id,
                u.name as employee_name,
                COUNT(ch.id) as total_checkins,
                COUNT(DISTINCT ch.client_id) as clients_visited_count,
                COALESCE(SUM(
                    CASE 
                        WHEN ch.checkout_time IS NOT NULL THEN 
                            (strftime('%s', ch.checkout_time) - strftime('%s', ch.checkin_time)) / 3600.0
                        ELSE 0 
                    END
                ), 0) as total_hours
            FROM users u
            LEFT JOIN checkins ch ON u.id = ch.employee_id 
                AND DATE(datetime(ch.checkin_time, '+05:30')) = ?
            WHERE u.manager_id = ? ${employeeFilter}
            GROUP BY u.id
        `, queryParams.length === 3 ? [date, req.user.id, employee_id] : [date, req.user.id]);

        // Calculate team aggregates from the employee stats
        const teamStats = employeeStats.reduce((acc, curr) => {
            acc.total_checkins += curr.total_checkins;
            acc.total_hours += curr.total_hours;
            acc.active_employees += (curr.total_checkins > 0 ? 1 : 0);
            return acc;
        }, {
            total_checkins: 0,
            total_hours: 0,
            active_employees: 0
        });

        // For total unique clients visited by the team, we need a separate query 
        // because summing individual unique counts would be wrong (overlapping clients)
        let teamClientQuery = `
            SELECT COUNT(DISTINCT ch.client_id) as team_unique_clients
            FROM checkins ch
            JOIN users u ON ch.employee_id = u.id
            WHERE u.manager_id = ? 
            AND DATE(datetime(ch.checkin_time, '+05:30')) = ?
        `;
        let teamClientParams = [req.user.id, date];

        if (employee_id) {
            teamClientQuery += ' AND u.id = ?';
            teamClientParams.push(employee_id);
        }

        const [teamClientStats] = await pool.execute(teamClientQuery, teamClientParams);
        teamStats.total_unique_clients = teamClientStats[0].team_unique_clients;

        // Round hours for display
        employeeStats.forEach(stat => {
            stat.total_hours = parseFloat(stat.total_hours.toFixed(2));
        });
        teamStats.total_hours = parseFloat(teamStats.total_hours.toFixed(2));

        res.json({
            success: true,
            data: {
                date: date,
                team_summary: teamStats,
                employee_breakdown: employeeStats
            }
        });

    } catch (error) {
        console.error('Daily summary report error:', error);
        res.status(500).json({ success: false, message: 'Failed to generate report' });
    }
});

module.exports = router;
