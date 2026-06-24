// app/(tabs)/dashboard.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '../../src/hooks/useAuth';
import { Ionicons } from '@expo/vector-icons';
import api from '../../src/services/api';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { BarChart, PieChart } from 'react-native-chart-kit';
import { expenseService } from '../../src/services/expenseService';
import { ProfitReport } from '../../src/types/expense';

const { width: screenWidth } = Dimensions.get('window');

interface MonthlyData {
  month: string;
  total_jobs: number;
  total_revenue: number;
}

interface ExpenseCategoryBreakdown {
  name: string;
  amount: number;
  color: string;
  legendFontColor: string;
  legendFontSize: number;
}

const COLORS = ['#ef4444', '#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

export default function DashboardScreen() {
  const [dashboardData, setDashboardData] = useState({
    totalJobs: 0,
    pendingJobs: 0,
    inProgressJobs: 0,
    completedJobs: 0,
    paidJobs: 0,
    todayRevenue: 0,
    totalRevenue: 0,
  });
  const [paymentBreakdown, setPaymentBreakdown] = useState({
    cash: { total: 0, count: 0, percentage: 0 },
    mpesa: { total: 0, count: 0, percentage: 0 },
  });
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profitReport, setProfitReport] = useState<ProfitReport | null>(null);
  const [expenseBreakdown, setExpenseBreakdown] = useState<ExpenseCategoryBreakdown[]>([]);
  
  const { role } = useAuth();
  const insets = useSafeAreaInsets();
  
  const isOwner = role === 'owner' || role === 'manager';
  
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const fetchJobs = async (status: string) => {
    try {
      const response = await api.get(`/jobs/?status=${status}`);
      const jobsData = Array.isArray(response.data) ? response.data : (response.data.results || []);
      return jobsData;
    } catch (error: any) {
      console.error(`Error fetching ${status} jobs:`, error);
      return [];
    }
  };

  // Update the loadProfitReport function to handle 404 gracefully
  const loadProfitReport = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const data = await expenseService.getProfitReport(today);
      setProfitReport(data);
    } catch (error: any) {
      console.error('Error loading profit report:', error);
      // Create fallback data using existing dashboard data
      const fallbackProfit = {
        date: new Date().toISOString().split('T')[0],
        revenue: dashboardData.todayRevenue || 0,
        expenses: 0,
        profit: dashboardData.todayRevenue || 0,
      };
      setProfitReport(fallbackProfit);
    }
  };

  // app/(tabs)/dashboard.tsx - Update the loadExpenseBreakdown function

  const loadExpenseBreakdown = async () => {
    try {
      const expenses = await expenseService.getExpenses();
      const today = new Date().toISOString().split('T')[0];
      
      // Filter expenses for today
      const todayExpenses = expenses.filter((e: { expense_date: string }) => e.expense_date === today);
      
      // Group by category
      const categoryMap = new Map<string, number>();
      todayExpenses.forEach(expense => {
        const current = categoryMap.get(expense.category_name) || 0;
        categoryMap.set(expense.category_name, current + parseFloat(expense.amount));
      });
      
      // Convert to chart data
      const categories = Array.from(categoryMap.entries());
      
      const chartData = categories.map(([name, amount], index) => ({
        name: name.length > 12 ? name.substring(0, 12) + '...' : name,
        amount: amount,
        color: COLORS[index % COLORS.length],
        legendFontColor: '#374151',
        legendFontSize: 12,
      }));
      
      setExpenseBreakdown(chartData);
    } catch (error) {
      console.error('Error loading expense breakdown:', error);
      setExpenseBreakdown([]);
    }
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      const [pendingJobs, inProgressJobs, completedJobs, paidJobs] = await Promise.all([
        fetchJobs('pending'),
        fetchJobs('in_progress'),
        fetchJobs('completed'),
        fetchJobs('paid'),
      ]);
      
      // Only count paid jobs for revenue
      let totalRevenue = 0;
      let todayRevenue = 0;
      let cashTotal = 0;
      let mpesaTotal = 0;
      let cashCount = 0;
      let mpesaCount = 0;
      const today = new Date().toISOString().split('T')[0];
      
      // Calculate revenue from paid jobs only
      for (const job of paidJobs) {
        const price = parseFloat(job.price);
        totalRevenue += price;
        
        const jobDate = job.end_time || job.created_at;
        if (jobDate && jobDate.split('T')[0] === today) {
          todayRevenue += price;
        }
      }
      
      // Get payments that are successful (status='success') only
      try {
        const paymentsRes = await api.get('/payments/');
        let allPayments: any[] = [];
        if (Array.isArray(paymentsRes.data)) {
          allPayments = paymentsRes.data;
        } else if (paymentsRes.data.results) {
          allPayments = paymentsRes.data.results;
        }
        
        const successfulPayments = allPayments.filter((p: { status: string }) => p.status === 'success');
        
        for (const payment of successfulPayments) {
          const amount = parseFloat(payment.amount);
          if (payment.method === 'cash') {
            cashTotal += amount;
            cashCount++;
          } else if (payment.method === 'mpesa_manual' || payment.method === 'mpesa_stk') {
            mpesaTotal += amount;
            mpesaCount++;
          }
        }
      } catch (error) {
        console.error('Error fetching payments:', error);
      }
      
      // Use the same total from paid jobs for consistency
      const consistentTotal = totalRevenue;
      const cashPercentage = consistentTotal > 0 ? (cashTotal / consistentTotal) * 100 : 0;
      const mpesaPercentage = consistentTotal > 0 ? (mpesaTotal / consistentTotal) * 100 : 0;
      
      setDashboardData({
        totalJobs: pendingJobs.length + inProgressJobs.length + completedJobs.length + paidJobs.length,
        pendingJobs: pendingJobs.length,
        inProgressJobs: inProgressJobs.length,
        completedJobs: completedJobs.length,
        paidJobs: paidJobs.length,
        todayRevenue: todayRevenue,
        totalRevenue: consistentTotal,
      });
      
      setPaymentBreakdown({
        cash: { total: cashTotal, count: cashCount, percentage: cashPercentage },
        mpesa: { total: mpesaTotal, count: mpesaCount, percentage: mpesaPercentage },
      });
      
      // Load monthly data
      await loadMonthlyData();
      
      // Load profit report with fallback
      await loadProfitReport();
      
      // Load expense breakdown
      await loadExpenseBreakdown();
      
    } catch (error: any) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMonthlyData = async () => {
    try {
      const allJobsRes = await api.get('/jobs/');
      let allJobs = [];
      if (Array.isArray(allJobsRes.data)) {
        allJobs = allJobsRes.data;
      } else if (allJobsRes.data.results) {
        allJobs = allJobsRes.data.results;
      }
      
      // Only count paid jobs for monthly data
      const paidJobs = allJobs.filter((job: { status: string; }) => job.status === 'paid');
      
      const monthlyMap = new Map();
      months.forEach(month => {
        monthlyMap.set(month, { month, total_jobs: 0, total_revenue: 0 });
      });
      
      for (const job of paidJobs) {
        const jobDate = job.end_time || job.created_at;
        if (jobDate) {
          const date = new Date(jobDate);
          const year = date.getFullYear();
          
          if (year === selectedYear) {
            const monthName = months[date.getMonth()];
            const existing = monthlyMap.get(monthName);
            monthlyMap.set(monthName, {
              month: monthName,
              total_jobs: existing.total_jobs + 1,
              total_revenue: existing.total_revenue + parseFloat(job.price),
            });
          }
        }
      }
      
      setMonthlyData(Array.from(monthlyMap.values()));
      
    } catch (error) {
      console.error('Error loading monthly data:', error);
    }
  };

  const changeMonth = (increment: number) => {
    let newMonth = selectedMonth + increment;
    let newYear = selectedYear;
    
    if (newMonth < 0) {
      newMonth = 11;
      newYear--;
    } else if (newMonth > 11) {
      newMonth = 0;
      newYear++;
    }
    
    setSelectedMonth(newMonth);
    setSelectedYear(newYear);
  };

  const changeYear = (increment: number) => {
    setSelectedYear(selectedYear + increment);
  };

  const getCurrentMonthData = () => {
    const currentMonthName = months[selectedMonth];
    const monthData = monthlyData.find(m => m.month === currentMonthName);
    return monthData || { month: currentMonthName, total_jobs: 0, total_revenue: 0 };
  };

  useEffect(() => {
    if (isOwner) {
      loadDashboardData();
    } else {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOwner && !loading) {
      loadMonthlyData();
    }
  }, [selectedYear]);

  useFocusEffect(
    useCallback(() => {
      if (isOwner) {
        loadDashboardData();
      }
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const formatCurrency = (amount: number) => {
    return `KES ${amount.toLocaleString()}`;
  };

  const chartData = {
    labels: monthlyData.map(m => m.month),
    datasets: [
      {
        data: monthlyData.map(m => m.total_revenue),
      },
    ],
  };

  const barChartConfig = {
    backgroundGradientFrom: '#fff',
    backgroundGradientTo: '#fff',
    color: (opacity: number = 1) => `rgba(59, 130, 246, ${opacity})`,
    strokeWidth: 2,
    barPercentage: 0.7,
    decimalPlaces: 0,
    formatYLabel: (value: string) => {
      const num = parseInt(value);
      if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
      if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
      return value;
    },
    propsForLabels: {
      fontSize: 10,
    },
  };

  const pieChartConfig = {
    color: (opacity: number = 1) => `rgba(0, 0, 0, ${opacity})`,
  };

  const currentMonthData = getCurrentMonthData();
  const hasExpenses = expenseBreakdown.length > 0;

  if (!isOwner) {
    return (
      <View style={styles.unauthorizedContainer}>
        <Ionicons name="lock-closed-outline" size={64} color="#ef4444" />
        <Text style={styles.unauthorizedTitle}>Access Denied</Text>
        <Text style={styles.unauthorizedText}>
          You don't have permission to view the dashboard.
        </Text>
      </View>
    );
  }

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />
      }
    >
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.title}>Dashboard</Text>
      </View>

      {/* Summary Cards */}
      <View style={styles.summaryGrid}>
        <View style={styles.summaryCard}>
          <View style={[styles.iconContainer, { backgroundColor: '#eff6ff' }]}>
            <Ionicons name="briefcase-outline" size={24} color="#3b82f6" />
          </View>
          <Text style={styles.summaryValue}>{dashboardData.totalJobs}</Text>
          <Text style={styles.summaryLabel}>Total Jobs</Text>
        </View>

        <View style={styles.summaryCard}>
          <View style={[styles.iconContainer, { backgroundColor: '#fef3c7' }]}>
            <Ionicons name="time-outline" size={24} color="#f59e0b" />
          </View>
          <Text style={styles.summaryValue}>{dashboardData.pendingJobs}</Text>
          <Text style={styles.summaryLabel}>Pending</Text>
        </View>

        <View style={styles.summaryCard}>
          <View style={[styles.iconContainer, { backgroundColor: '#dbeafe' }]}>
            <Ionicons name="play-circle-outline" size={24} color="#3b82f6" />
          </View>
          <Text style={styles.summaryValue}>{dashboardData.inProgressJobs}</Text>
          <Text style={styles.summaryLabel}>In Progress</Text>
        </View>

        <View style={styles.summaryCard}>
          <View style={[styles.iconContainer, { backgroundColor: '#d1fae5' }]}>
            <Ionicons name="checkmark-circle-outline" size={24} color="#10b981" />
          </View>
          <Text style={styles.summaryValue}>{dashboardData.completedJobs + dashboardData.paidJobs}</Text>
          <Text style={styles.summaryLabel}>Completed</Text>
        </View>
      </View>

      {/* Profit Overview Section */}
      {profitReport && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today's Profit Overview</Text>
          
          <View style={styles.profitGrid}>
            <View style={[styles.profitCard, { backgroundColor: '#d1fae5' }]}>
              <Ionicons name="trending-up-outline" size={20} color="#10b981" />
              <Text style={styles.profitLabel}>Revenue</Text>
              <Text style={[styles.profitValue, { color: '#10b981' }]}>
                {formatCurrency(profitReport.revenue)}
              </Text>
            </View>
            
            <View style={[styles.profitCard, { backgroundColor: '#fee2e2' }]}>
              <Ionicons name="trending-down-outline" size={20} color="#ef4444" />
              <Text style={styles.profitLabel}>Expenses</Text>
              <Text style={[styles.profitValue, { color: '#ef4444' }]}>
                {formatCurrency(profitReport.expenses)}
              </Text>
            </View>
            
            <View style={[styles.profitCard, { backgroundColor: '#dbeafe' }]}>
              <Ionicons name="cash-outline" size={20} color="#3b82f6" />
              <Text style={styles.profitLabel}>Profit</Text>
              <Text style={[styles.profitValue, { color: '#3b82f6' }]}>
                {formatCurrency(profitReport.profit)}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Expense Breakdown Chart */}
      {hasExpenses && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Expense Breakdown (Today)</Text>
          <View style={styles.chartContainer}>
            <PieChart
              data={expenseBreakdown}
              width={screenWidth - 32}
              height={200}
              chartConfig={pieChartConfig}
              accessor="amount"
              backgroundColor="transparent"
              paddingLeft="15"
              absolute
            />
          </View>
          <View style={styles.expenseTotal}>
            <Text style={styles.expenseTotalLabel}>Total Expenses Today</Text>
            <Text style={styles.expenseTotalValue}>
              {formatCurrency(expenseBreakdown.reduce((sum, item) => sum + item.amount, 0))}
            </Text>
          </View>
        </View>
      )}

      {/* Revenue Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Revenue Overview</Text>
        
        <View style={styles.revenueCards}>
          <View style={styles.revenueCard}>
            <Text style={styles.revenueLabel}>Today</Text>
            <Text style={styles.revenueValue}>{formatCurrency(dashboardData.todayRevenue)}</Text>
          </View>
          <View style={styles.revenueCard}>
            <Text style={styles.revenueLabel}>Total</Text>
            <Text style={styles.revenueValue}>{formatCurrency(dashboardData.totalRevenue)}</Text>
          </View>
        </View>
      </View>

      {/* Payment Methods */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Payment Methods</Text>
        
        <View style={styles.paymentMethodCard}>
          <View style={[styles.paymentMethodIcon, { backgroundColor: '#d1fae5' }]}>
            <Ionicons name="cash-outline" size={28} color="#10b981" />
          </View>
          <View style={styles.paymentMethodInfo}>
            <Text style={styles.paymentMethodName}>Cash</Text>
            <Text style={styles.paymentMethodAmount}>{formatCurrency(paymentBreakdown.cash.total)}</Text>
            <Text style={styles.paymentMethodCount}>{paymentBreakdown.cash.count} transactions</Text>
          </View>
          <View style={styles.paymentMethodPercent}>
            <Text style={styles.percentText}>
              {paymentBreakdown.cash.percentage.toFixed(1)}%
            </Text>
          </View>
        </View>

        <View style={styles.paymentMethodCard}>
          <View style={[styles.paymentMethodIcon, { backgroundColor: '#e9d5ff' }]}>
            <Ionicons name="phone-portrait-outline" size={28} color="#8b5cf6" />
          </View>
          <View style={styles.paymentMethodInfo}>
            <Text style={styles.paymentMethodName}>M-Pesa</Text>
            <Text style={styles.paymentMethodAmount}>{formatCurrency(paymentBreakdown.mpesa.total)}</Text>
            <Text style={styles.paymentMethodCount}>{paymentBreakdown.mpesa.count} transactions</Text>
          </View>
          <View style={styles.paymentMethodPercent}>
            <Text style={styles.percentText}>
              {paymentBreakdown.mpesa.percentage.toFixed(1)}%
            </Text>
          </View>
        </View>
        
        <View style={styles.totalInfo}>
          <Text style={styles.totalInfoText}>
            Total from paid jobs: {formatCurrency(dashboardData.totalRevenue)}
          </Text>
          <Text style={styles.totalInfoSubtext}>
            (Cash + M-Pesa should equal total revenue)
          </Text>
        </View>
      </View>

      {/* Monthly Performance - Single Month View */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Monthly Performance</Text>
        
        <View style={styles.monthSelectorContainer}>
          <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.monthNavButton}>
            <Ionicons name="chevron-back" size={24} color="#3b82f6" />
          </TouchableOpacity>
          
          <View style={styles.monthYearDisplay}>
            <Text style={styles.monthText}>{months[selectedMonth]}</Text>
            <View style={styles.yearNav}>
              <TouchableOpacity onPress={() => changeYear(-1)} style={styles.yearNavButton}>
                <Ionicons name="chevron-back" size={16} color="#6b7280" />
              </TouchableOpacity>
              <Text style={styles.yearText}>{selectedYear}</Text>
              <TouchableOpacity onPress={() => changeYear(1)} style={styles.yearNavButton}>
                <Ionicons name="chevron-forward" size={16} color="#6b7280" />
              </TouchableOpacity>
            </View>
          </View>
          
          <TouchableOpacity onPress={() => changeMonth(1)} style={styles.monthNavButton}>
            <Ionicons name="chevron-forward" size={24} color="#3b82f6" />
          </TouchableOpacity>
        </View>

        <View style={styles.monthStatsCard}>
          <View style={styles.monthStatItem}>
            <Text style={styles.monthStatLabel}>Jobs Completed</Text>
            <Text style={styles.monthStatValue}>{currentMonthData.total_jobs}</Text>
          </View>
          <View style={styles.monthStatDivider} />
          <View style={styles.monthStatItem}>
            <Text style={styles.monthStatLabel}>Revenue</Text>
            <Text style={styles.monthStatValue}>{formatCurrency(currentMonthData.total_revenue)}</Text>
          </View>
        </View>
      </View>

      {/* Yearly Chart - Shows full year trend */}
      <View style={styles.section}>
        <View style={styles.yearlyHeader}>
          <Text style={styles.sectionTitle}>Yearly Performance</Text>
          <View style={styles.yearSelector}>
            <TouchableOpacity onPress={() => changeYear(-1)} style={styles.yearSelectButton}>
              <Ionicons name="chevron-back" size={20} color="#3b82f6" />
            </TouchableOpacity>
            <Text style={styles.yearSelectText}>{selectedYear}</Text>
            <TouchableOpacity onPress={() => changeYear(1)} style={styles.yearSelectButton}>
              <Ionicons name="chevron-forward" size={20} color="#3b82f6" />
            </TouchableOpacity>
          </View>
        </View>
        
        {monthlyData.some(m => m.total_revenue > 0) ? (
          <>
            <BarChart
              data={chartData}
              width={screenWidth - 32}
              height={220}
              chartConfig={barChartConfig}
              style={styles.chart}
              showBarTops={false}
              fromZero={true}
              yAxisLabel=""
              yAxisSuffix=""
            />
            <View style={styles.yearlyStats}>
              <View style={styles.yearlyStat}>
                <Text style={styles.yearlyStatLabel}>Total Jobs</Text>
                <Text style={styles.yearlyStatValue}>
                  {monthlyData.reduce((sum, m) => sum + m.total_jobs, 0)}
                </Text>
              </View>
              <View style={styles.yearlyStat}>
                <Text style={styles.yearlyStatLabel}>Total Revenue</Text>
                <Text style={styles.yearlyStatValue}>
                  {formatCurrency(monthlyData.reduce((sum, m) => sum + m.total_revenue, 0))}
                </Text>
              </View>
              <View style={styles.yearlyStat}>
                <Text style={styles.yearlyStatLabel}>Average Monthly</Text>
                <Text style={styles.yearlyStatValue}>
                  {formatCurrency(monthlyData.reduce((sum, m) => sum + m.total_revenue, 0) / 12)}
                </Text>
              </View>
            </View>
          </>
        ) : (
          <View style={styles.emptyChart}>
            <Ionicons name="bar-chart-outline" size={48} color="#cbd5e1" />
            <Text style={styles.emptyText}>No data for {selectedYear}</Text>
          </View>
        )}
      </View>

      {/* Monthly Breakdown Table */}
      {monthlyData.some(m => m.total_jobs > 0) && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Monthly Breakdown</Text>
          {monthlyData.map((month, index) => (
            <View key={index} style={styles.monthRow}>
              <Text style={styles.monthName}>{month.month}</Text>
              <View style={styles.monthStats}>
                <Text style={styles.monthJobs}>{month.total_jobs} jobs</Text>
                <Text style={styles.monthRevenue}>{formatCurrency(month.total_revenue)}</Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  contentContainer: {
    paddingBottom: 24,
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1f2937',
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  summaryValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1f2937',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 12,
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
  },
  profitGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  profitCard: {
    flex: 1,
    minWidth: '30%',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  profitLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  profitValue: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 4,
  },
  chartContainer: {
    alignItems: 'center',
    marginVertical: 8,
  },
  expenseTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    marginTop: 8,
  },
  expenseTotalLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  expenseTotalValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ef4444',
  },
  revenueCards: {
    flexDirection: 'row',
    gap: 12,
  },
  revenueCard: {
    flex: 1,
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
  },
  revenueLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  revenueValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#10b981',
  },
  paymentMethodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  paymentMethodIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  paymentMethodInfo: {
    flex: 1,
  },
  paymentMethodName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
  },
  paymentMethodAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10b981',
    marginTop: 2,
  },
  paymentMethodCount: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 2,
  },
  paymentMethodPercent: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    minWidth: 60,
    alignItems: 'center',
  },
  percentText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
  },
  totalInfo: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    alignItems: 'center',
  },
  totalInfoText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  totalInfoSubtext: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 4,
  },
  monthSelectorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    marginBottom: 16,
  },
  monthNavButton: {
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  monthYearDisplay: {
    alignItems: 'center',
  },
  monthText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
  },
  yearNav: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  yearNavButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  yearText: {
    fontSize: 14,
    color: '#6b7280',
    marginHorizontal: 8,
  },
  monthStatsCard: {
    flexDirection: 'row',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  monthStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  monthStatLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  monthStatValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
  },
  monthStatDivider: {
    width: 1,
    backgroundColor: '#e5e7eb',
    marginHorizontal: 16,
  },
  yearlyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  yearSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    paddingHorizontal: 8,
  },
  yearSelectButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  yearSelectText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    paddingHorizontal: 8,
  },
  yearlyStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  yearlyStat: {
    alignItems: 'center',
    flex: 1,
  },
  yearlyStatLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  yearlyStatValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
    marginTop: 4,
  },
  chart: {
    marginVertical: 8,
    marginLeft: -20,
    borderRadius: 12,
  },
  monthRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  monthName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1f2937',
  },
  monthStats: {
    flexDirection: 'row',
    gap: 16,
  },
  monthJobs: {
    fontSize: 14,
    color: '#6b7280',
  },
  monthRevenue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10b981',
  },
  emptyChart: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: 12,
  },
  unauthorizedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    padding: 20,
  },
  unauthorizedTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
    marginTop: 16,
    marginBottom: 8,
  },
  unauthorizedText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
});