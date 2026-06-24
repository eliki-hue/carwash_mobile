// app/(stack)/financial-analytics.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
  Alert,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { PieChart } from 'react-native-chart-kit';
import { expenseService } from '../../src/services/expenseService';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import DateTimePicker from '@react-native-community/datetimepicker';
import api from '../../src/services/api';

const { width: screenWidth } = Dimensions.get('window');

type DateRange = 'today' | 'week' | 'month' | 'year' | 'custom';

interface AnalyticsData {
  revenue: number;
  expenses: number;
  profit: number;
  dateRange: string;
  expenseBreakdown: { name: string; amount: number; color: string }[];
}

const COLORS = ['#ef4444', '#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

export default function FinancialAnalyticsScreen() {
  const [data, setData] = useState<AnalyticsData>({
    revenue: 0,
    expenses: 0,
    profit: 0,
    dateRange: 'Today',
    expenseBreakdown: [],
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedRange, setSelectedRange] = useState<DateRange>('today');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [dateRangeLabel, setDateRangeLabel] = useState('Today');
  const [isCustomDateSelected, setIsCustomDateSelected] = useState(false);
  
  // Use ref to track if we're currently fetching
  const isFetchingRef = useRef(false);

  const insets = useSafeAreaInsets();

  const getDateRange = useCallback((): { startDate: Date; endDate: Date; label: string } => {
    let startDate = new Date();
    let endDate = new Date();
    let label = 'Today';

    if (selectedRange === 'custom' || isCustomDateSelected) {
      const selected = new Date(selectedDate);
      selected.setHours(0, 0, 0, 0);
      startDate = new Date(selected);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(selected);
      endDate.setHours(23, 59, 59, 999);
      label = selected.toLocaleDateString('en-US', { 
        weekday: 'short', 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
      return { startDate, endDate, label };
    }

    switch (selectedRange) {
      case 'today':
        startDate = new Date();
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date();
        endDate.setHours(23, 59, 59, 999);
        label = 'Today';
        break;
      case 'week':
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date();
        endDate.setHours(23, 59, 59, 999);
        label = 'Last 7 Days';
        break;
      case 'month':
        startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 1);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date();
        endDate.setHours(23, 59, 59, 999);
        label = 'Last 30 Days';
        break;
      case 'year':
        startDate = new Date();
        startDate.setFullYear(startDate.getFullYear() - 1);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date();
        endDate.setHours(23, 59, 59, 999);
        label = 'Last 12 Months';
        break;
      default:
        break;
    }

    return { startDate, endDate, label };
  }, [selectedRange, selectedDate, isCustomDateSelected]);

  const fetchAnalytics = useCallback(async () => {
    // Prevent multiple simultaneous fetches
    if (isFetchingRef.current) {
      console.log('Already fetching, skipping...');
      return;
    }
    
    isFetchingRef.current = true;
    
    try {
      setLoading(true);
      
      const { startDate, endDate, label } = getDateRange();
      
      // Fetch revenue from paid jobs
      let revenue = 0;
      try {
        const response = await api.get('/jobs/?status=paid');
        const jobs = Array.isArray(response.data) ? response.data : (response.data.results || []);
        
        const filtered = jobs.filter((job: any) => {
          const jobDate = new Date(job.end_time || job.created_at);
          return jobDate >= startDate && jobDate <= endDate;
        });
        
        revenue = filtered.reduce((sum: number, job: any) => sum + parseFloat(job.price || 0), 0);
      } catch (error) {
        console.error('Error fetching revenue:', error);
        revenue = 0;
      }
      
      // Fetch expenses
      let expenses = 0;
      let expenseBreakdown: { name: string; amount: number; color: string }[] = [];
      
      try {
        const allExpenses = await expenseService.getExpenses();
        const filteredExpenses = allExpenses.filter((expense) => {
          const expenseDate = new Date(expense.expense_date);
          return expenseDate >= startDate && expenseDate <= endDate;
        });
        
        expenses = filteredExpenses.reduce((sum, expense) => sum + parseFloat(expense.amount), 0);
        
        // Create breakdown by category
        const categoryMap = new Map<string, number>();
        filteredExpenses.forEach((expense) => {
          const current = categoryMap.get(expense.category_name) || 0;
          categoryMap.set(expense.category_name, current + parseFloat(expense.amount));
        });
        
        const categories = Array.from(categoryMap.entries());
        expenseBreakdown = categories.map(([name, amount], index) => ({
          name: name.length > 12 ? name.substring(0, 12) + '...' : name,
          amount: amount,
          color: COLORS[index % COLORS.length],
        }));
      } catch (error) {
        console.error('Error fetching expenses:', error);
        expenses = 0;
        expenseBreakdown = [];
      }

      setData({
        revenue,
        expenses,
        profit: revenue - expenses,
        dateRange: label,
        expenseBreakdown,
      });

      setDateRangeLabel(label);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      Alert.alert('Error', 'Failed to load analytics data');
    } finally {
      setLoading(false);
      setRefreshing(false);
      isFetchingRef.current = false;
    }
  }, [getDateRange]);

  const handleRangeSelect = useCallback((range: DateRange) => {
    setSelectedRange(range);
    setIsCustomDateSelected(false);
    if (range === 'custom') {
      setShowDatePicker(true);
    }
    // Don't fetch immediately - let the useEffect handle it
  }, []);

  const handleDateChange = useCallback((event: any, date?: Date) => {
    setShowDatePicker(false);
    if (date) {
      setSelectedDate(date);
      setIsCustomDateSelected(true);
      setSelectedRange('custom');
    }
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAnalytics();
  }, [fetchAnalytics]);

  // Fetch when range or date changes
  useEffect(() => {
    // Only fetch if not in custom mode with picker open
    if (!(selectedRange === 'custom' && showDatePicker)) {
      fetchAnalytics();
    }
  }, [selectedRange, selectedDate, isCustomDateSelected, fetchAnalytics, showDatePicker]);

  // Refetch when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchAnalytics();
      return () => {
        // Cleanup if needed
      };
    }, [fetchAnalytics])
  );

  const formatCurrency = (amount: number) => {
    return `KES ${amount.toLocaleString()}`;
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  const hasExpenseData = data.expenseBreakdown.length > 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.contentContainer, { paddingTop: insets.top + 16 }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Financial Analytics</Text>
        <Text style={styles.subtitle}>{dateRangeLabel}</Text>
      </View>

      {/* Date Range Selector */}
      <View style={styles.selectorContainer}>
        {(['today', 'week', 'month', 'year'] as DateRange[]).map((range) => (
          <TouchableOpacity
            key={range}
            style={[
              styles.selectorButton,
              selectedRange === range && !isCustomDateSelected && styles.selectorButtonActive,
            ]}
            onPress={() => handleRangeSelect(range)}
          >
            <Text
              style={[
                styles.selectorText,
                selectedRange === range && !isCustomDateSelected && styles.selectorTextActive,
              ]}
            >
              {range.charAt(0).toUpperCase() + range.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          style={[
            styles.selectorButton, 
            styles.customButton,
            isCustomDateSelected && styles.selectorButtonActive,
          ]}
          onPress={() => setShowDatePicker(true)}
        >
          <Ionicons name="calendar-outline" size={18} color={isCustomDateSelected ? '#fff' : '#6b7280'} />
          <Text style={[styles.selectorText, isCustomDateSelected && styles.selectorTextActive]}>
            Custom
          </Text>
        </TouchableOpacity>
      </View>

      {/* Summary Cards */}
      <View style={styles.summaryGrid}>
        <View style={[styles.summaryCard, { backgroundColor: '#ecfdf5' }]}>
          <View style={styles.summaryIconContainer}>
            <Ionicons name="trending-up-outline" size={24} color="#10b981" />
          </View>
          <Text style={[styles.summaryValue, { color: '#10b981' }]}>
            {formatCurrency(data.revenue)}
          </Text>
          <Text style={styles.summaryLabel}>Revenue</Text>
        </View>

        <View style={[styles.summaryCard, { backgroundColor: '#fef2f2' }]}>
          <View style={styles.summaryIconContainer}>
            <Ionicons name="trending-down-outline" size={24} color="#ef4444" />
          </View>
          <Text style={[styles.summaryValue, { color: '#ef4444' }]}>
            {formatCurrency(data.expenses)}
          </Text>
          <Text style={styles.summaryLabel}>Expenses</Text>
        </View>

        <View style={[styles.summaryCard, { backgroundColor: '#eff6ff' }]}>
          <View style={styles.summaryIconContainer}>
            <Ionicons name="cash-outline" size={24} color="#3b82f6" />
          </View>
          <Text style={[styles.summaryValue, { color: '#3b82f6' }]}>
            {formatCurrency(data.profit)}
          </Text>
          <Text style={styles.summaryLabel}>Profit</Text>
        </View>
      </View>

      {/* Expense Breakdown Chart */}
      {hasExpenseData ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Expense Breakdown</Text>
          <View style={styles.chartContainer}>
            <PieChart
              data={data.expenseBreakdown.map(item => ({
                ...item,
                legendFontColor: '#374151',
                legendFontSize: 12,
              }))}
              width={screenWidth - 32}
              height={200}
              chartConfig={{
                color: (opacity: number = 1) => `rgba(0, 0, 0, ${opacity})`,
              }}
              accessor="amount"
              backgroundColor="transparent"
              paddingLeft="15"
              absolute
            />
          </View>
        </View>
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="pie-chart-outline" size={48} color="#d1d5db" />
          <Text style={styles.emptyText}>No expense data available</Text>
          <Text style={styles.emptySubtext}>Add expenses to see breakdown</Text>
        </View>
      )}

      {/* Date Picker */}
      {showDatePicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateChange}
        />
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
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  selectorContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  selectorButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectorButtonActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  selectorText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  selectorTextActive: {
    color: '#fff',
  },
  customButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  summaryCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  summaryIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  section: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
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
    marginBottom: 16,
  },
  chartContainer: {
    alignItems: 'center',
  },
  emptyContainer: {
    backgroundColor: '#fff',
    padding: 40,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 4,
  },
});