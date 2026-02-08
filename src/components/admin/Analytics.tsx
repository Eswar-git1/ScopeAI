"use client";

import { motion } from "framer-motion";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    LineChart,
    Line,
    PieChart,
    Pie,
    Cell,
} from "recharts";

interface AnalyticsProps {
    stats: {
        totalUsers: number;
        totalDocuments: number;
        activeProjects: number;
        pendingReviews: number;
    };
}

const data = [
    { name: "Mon", users: 40, documents: 24, activity: 2400 },
    { name: "Tue", users: 30, documents: 13, activity: 2210 },
    { name: "Wed", users: 20, documents: 98, activity: 2290 },
    { name: "Thu", users: 27, documents: 39, activity: 2000 },
    { name: "Fri", users: 18, documents: 48, activity: 2181 },
    { name: "Sat", users: 23, documents: 38, activity: 2500 },
    { name: "Sun", users: 34, documents: 43, activity: 2100 },
];

const pieData = [
    { name: "Draft", value: 400 },
    { name: "Review", value: 300 },
    { name: "Approved", value: 300 },
    { name: "Archived", value: 200 },
];

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"];

export function Analytics({ stats }: AnalyticsProps) {
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* User Activity Chart */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl p-6"
                >
                    <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
                        User Activity
                    </h3>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                                <XAxis dataKey="name" stroke="var(--text-secondary)" />
                                <YAxis stroke="var(--text-secondary)" />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: "var(--bg-tertiary)",
                                        border: "1px solid var(--border-subtle)",
                                        borderRadius: "8px",
                                    }}
                                />
                                <Legend />
                                <Bar dataKey="users" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="documents" fill="#10b981" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>

                {/* Document Status Distribution */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl p-6"
                >
                    <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
                        Document Status
                    </h3>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {pieData.map((entry, index) => (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={COLORS[index % COLORS.length]}
                                        />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: "var(--bg-tertiary)",
                                        border: "1px solid var(--border-subtle)",
                                        borderRadius: "8px",
                                    }}
                                />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>

                {/* System Performance */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl p-6 lg:col-span-2"
                >
                    <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
                        System Performance
                    </h3>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={data}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                                <XAxis dataKey="name" stroke="var(--text-secondary)" />
                                <YAxis stroke="var(--text-secondary)" />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: "var(--bg-tertiary)",
                                        border: "1px solid var(--border-subtle)",
                                        borderRadius: "8px",
                                    }}
                                />
                                <Legend />
                                <Line
                                    type="monotone"
                                    dataKey="activity"
                                    stroke="#8884d8"
                                    strokeWidth={2}
                                    activeDot={{ r: 8 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
