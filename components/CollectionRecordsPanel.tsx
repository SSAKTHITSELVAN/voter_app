import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import { Colors, FontSizes, Radius, Shadows, Spacing } from '@/constants/theme';
import { householdsApi } from '@/lib/api';
import { CollectionRecord } from '@/lib/types';
import { StatusBadge } from './StatusBadge';
import { ThemedButton } from './ThemedButton';

interface CollectionRecordsPanelProps {
  active: boolean;
}

function getLandmarkImageCount(record: CollectionRecord): number {
  const raw = record.raw_data_json;
  if (!raw || typeof raw !== 'object') return 0;
  const value = (raw as Record<string, unknown>).landmark_image_urls;
  return Array.isArray(value) ? value.length : 0;
}

function getAddress(record: CollectionRecord): string {
  if (record.household_address_text?.trim()) return record.household_address_text;
  const raw = record.raw_data_json;
  if (raw && typeof raw === 'object') {
    const addressText = (raw as Record<string, unknown>).address_text;
    if (typeof addressText === 'string' && addressText.trim()) {
      return addressText;
    }
  }
  if (record.household_latitude != null && record.household_longitude != null) {
    return `${record.household_latitude.toFixed(5)}, ${record.household_longitude.toFixed(5)}`;
  }
  return 'Address unavailable';
}

function getPersonSummary(record: CollectionRecord): string {
  const raw = record.raw_data_json;
  if (!raw || typeof raw !== 'object') return '';
  const persons = (raw as Record<string, unknown>).persons;
  if (!Array.isArray(persons)) return '';

  const summary = persons
    .filter((person): person is Record<string, unknown> => typeof person === 'object' && person !== null)
    .map((person) => {
      const rawName = person.name;
      const name = typeof rawName === 'string' ? rawName.trim() : '';
      const age = person.age;
      if (name && age !== null && age !== undefined && age !== '') {
        return `${name} (Age ${age})`;
      }
      if (name) {
        return name;
      }
      if (age !== null && age !== undefined && age !== '') {
        return `Age ${age}`;
      }
      return '';
    })
    .filter(Boolean);

  return summary.join('; ');
}

async function saveCsvFile(csvText: string, fileName: string): Promise<string> {
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return fileName;
  }

  const baseDirectory = FileSystem.documentDirectory ?? FileSystem.cacheDirectory;
  if (!baseDirectory) {
    throw new Error('No writable export directory is available on this device.');
  }

  const fileUri = `${baseDirectory}${fileName}`;
  await FileSystem.writeAsStringAsync(fileUri, csvText, {
    encoding: FileSystem.EncodingType.UTF8,
  });
  return fileUri;
}

export function CollectionRecordsPanel({ active }: CollectionRecordsPanelProps) {
  const [records, setRecords] = useState<CollectionRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [bulkExporting, setBulkExporting] = useState(false);
  const [exportingRecordId, setExportingRecordId] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');

  const loadRecords = useCallback(async (search = appliedSearch) => {
    setLoading(true);
    try {
      const result = await householdsApi.adminCollectionRecords({
        limit: 200,
        offset: 0,
        search: search || undefined,
      });
      setRecords(result);
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Could not load collected data.');
    } finally {
      setLoading(false);
    }
  }, [appliedSearch]);

  useEffect(() => {
    if (!active) return;
    void loadRecords(appliedSearch);
  }, [active, appliedSearch, loadRecords]);

  const summary = useMemo(() => {
    const totalPeople = records.reduce((sum, record) => sum + record.total_people, 0);
    const totalVoters = records.reduce((sum, record) => sum + record.total_voters, 0);
    return {
      totalPeople,
      totalVoters,
    };
  }, [records]);

  async function exportCsv(params: {
    fileName: string;
    search?: string;
    record_id?: string;
    limit?: number;
  }) {
    const csvText = await householdsApi.exportCollectionRecordsCsv({
      search: params.search,
      record_id: params.record_id,
      limit: params.limit,
    });
    const savedPath = await saveCsvFile(csvText, params.fileName);
    Alert.alert('CSV exported', `Saved to ${savedPath}`);
  }

  async function handleBulkExport() {
    setBulkExporting(true);
    try {
      await exportCsv({
        fileName: `collection-records-${Date.now()}.csv`,
        search: appliedSearch || undefined,
        limit: 5000,
      });
    } catch (err: any) {
      Alert.alert('Export failed', err.message ?? 'Could not export collected data.');
    } finally {
      setBulkExporting(false);
    }
  }

  async function handleSingleExport(record: CollectionRecord) {
    setExportingRecordId(record.id);
    try {
      await exportCsv({
        fileName: `collection-record-${record.id}.csv`,
        record_id: record.id,
        limit: 1,
      });
    } catch (err: any) {
      Alert.alert('Export failed', err.message ?? 'Could not export this collected record.');
    } finally {
      setExportingRecordId(null);
    }
  }

  function applySearch() {
    setAppliedSearch(searchInput.trim());
  }

  function clearSearch() {
    setSearchInput('');
    setAppliedSearch('');
  }

  if (loading && records.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.primary} size="large" />
        <Text style={styles.loadingText}>Loading collected data...</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={records}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
      keyboardShouldPersistTaps="handled"
      ListHeaderComponent={
        <View style={styles.headerWrap}>
          <View style={styles.searchCard}>
            <Text style={styles.sectionTitle}>Collected Data</Text>
            <Text style={styles.sectionSub}>
              Only admin and super admin can view and export field-user collection records.
            </Text>

            <View style={styles.searchRow}>
              <View style={styles.searchInputWrap}>
                <Ionicons name="search-outline" size={16} color={Colors.textMuted} />
                <TextInput
                  style={styles.searchInput}
                  value={searchInput}
                  onChangeText={setSearchInput}
                  placeholder="Search collector name, phone, or address"
                  placeholderTextColor={Colors.midGray}
                  returnKeyType="search"
                  onSubmitEditing={applySearch}
                />
              </View>
              <Pressable onPress={applySearch} style={styles.searchBtn}>
                <Text style={styles.searchBtnText}>Search</Text>
              </Pressable>
            </View>

            <View style={styles.actionRow}>
              <ThemedButton
                title={bulkExporting ? 'Exporting...' : 'Export All CSV'}
                onPress={() => void handleBulkExport()}
                loading={bulkExporting}
                size="sm"
              />
              <Pressable onPress={clearSearch} style={styles.clearBtn}>
                <Text style={styles.clearBtnText}>Clear</Text>
              </Pressable>
              <Pressable onPress={() => void loadRecords(appliedSearch)} style={styles.refreshBtn}>
                <Ionicons name="refresh" size={16} color={Colors.primary} />
              </Pressable>
            </View>
          </View>

          <View style={styles.summaryRow}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryValue}>{records.length}</Text>
              <Text style={styles.summaryLabel}>Records</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryValue}>{summary.totalPeople}</Text>
              <Text style={styles.summaryLabel}>People</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryValue}>{summary.totalVoters}</Text>
              <Text style={styles.summaryLabel}>Voters</Text>
            </View>
          </View>
        </View>
      }
      renderItem={({ item }) => {
        const landmarkImageCount = getLandmarkImageCount(item);
        const personSummary = getPersonSummary(item);
        const exportingThisRecord = exportingRecordId === item.id;
        return (
          <View style={styles.recordCard}>
            <View style={styles.recordTopRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.collectorName}>{item.collected_by_name ?? 'Unknown Collector'}</Text>
                <Text style={styles.collectorPhone}>{item.collected_by_phone ?? item.collected_by}</Text>
              </View>
              {item.collected_by_role ? <StatusBadge status={item.collected_by_role} /> : null}
            </View>

            <View style={styles.metaRow}>
              <Ionicons name="home-outline" size={14} color={Colors.primary} />
              <Text style={styles.metaText}>{getAddress(item)}</Text>
            </View>

            <View style={styles.metaRow}>
              <Ionicons name="layers-outline" size={14} color={Colors.gold} />
              <Text style={styles.metaText}>{item.household_house_type ?? 'Unknown house type'}</Text>
            </View>

            <View style={styles.metaRowTop}>
              <Ionicons name="people-outline" size={14} color={Colors.info} />
              <Text style={styles.metaText}>{personSummary || 'No person names recorded'}</Text>
            </View>

            <View style={styles.metricsRow}>
              <View style={styles.metricPill}>
                <Text style={styles.metricValue}>{item.total_people}</Text>
                <Text style={styles.metricLabel}>People</Text>
              </View>
              <View style={styles.metricPill}>
                <Text style={styles.metricValue}>{item.total_voters}</Text>
                <Text style={styles.metricLabel}>Voters</Text>
              </View>
              <View style={styles.metricPill}>
                <Text style={styles.metricValue}>{landmarkImageCount}</Text>
                <Text style={styles.metricLabel}>Images</Text>
              </View>
            </View>

            <View style={styles.footerRow}>
              <Text style={styles.timestampText}>
                {new Date(item.created_at).toLocaleString('en-IN')}
              </Text>
              <Text style={styles.recordIdText} numberOfLines={1}>
                {item.id}
              </Text>
            </View>

            <View style={styles.cardActionRow}>
              <ThemedButton
                title={exportingThisRecord ? 'Exporting...' : 'Export CSV'}
                onPress={() => void handleSingleExport(item)}
                loading={exportingThisRecord}
                size="sm"
              />
            </View>
          </View>
        );
      }}
      ListEmptyComponent={
        <View style={styles.emptyState}>
          <Ionicons name="document-text-outline" size={40} color={Colors.border} />
          <Text style={styles.emptyTitle}>No collected data found</Text>
          <Text style={styles.emptySub}>Try a different search or collect a new household.</Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingText: {
    color: Colors.textMuted,
    fontSize: FontSizes.sm,
  },
  list: {
    padding: Spacing.md,
    paddingBottom: 36,
    gap: Spacing.md,
  },
  headerWrap: {
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },
  searchCard: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.card,
  },
  sectionTitle: {
    fontSize: FontSizes.xl,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  sectionSub: {
    marginTop: 6,
    color: Colors.textMuted,
    fontSize: FontSizes.sm,
    lineHeight: 20,
  },
  searchRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  searchInputWrap: {
    flex: 1,
    minHeight: 48,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.bgCardRaised,
    paddingHorizontal: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: FontSizes.sm,
  },
  searchBtn: {
    minWidth: 84,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryMuted,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.borderRed,
    paddingHorizontal: Spacing.md,
  },
  searchBtnText: {
    color: Colors.primary,
    fontWeight: '700',
    fontSize: FontSizes.sm,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  clearBtn: {
    minHeight: 36,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearBtnText: {
    color: Colors.textMuted,
    fontWeight: '700',
    fontSize: FontSizes.sm,
  },
  refreshBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.bgCardRaised,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    ...Shadows.card,
  },
  summaryValue: {
    color: Colors.textPrimary,
    fontSize: FontSizes.lg,
    fontWeight: '900',
  },
  summaryLabel: {
    marginTop: 4,
    color: Colors.textMuted,
    fontSize: FontSizes.xs,
    fontWeight: '700',
  },
  recordCard: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 10,
    ...Shadows.card,
  },
  recordTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  collectorName: {
    color: Colors.textPrimary,
    fontSize: FontSizes.md,
    fontWeight: '800',
  },
  collectorPhone: {
    color: Colors.textMuted,
    fontSize: FontSizes.xs,
    marginTop: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaRowTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  metaText: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: FontSizes.sm,
    lineHeight: 19,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  metricPill: {
    flex: 1,
    backgroundColor: Colors.bgCardRaised,
    borderRadius: Radius.md,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  metricValue: {
    color: Colors.textPrimary,
    fontSize: FontSizes.md,
    fontWeight: '900',
  },
  metricLabel: {
    marginTop: 4,
    color: Colors.textMuted,
    fontSize: FontSizes.xs,
    fontWeight: '700',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  timestampText: {
    color: Colors.textMuted,
    fontSize: FontSizes.xs,
  },
  recordIdText: {
    flex: 1,
    textAlign: 'right',
    color: Colors.midGray,
    fontSize: 10,
  },
  cardActionRow: {
    alignItems: 'flex-start',
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 56,
    gap: 8,
  },
  emptyTitle: {
    color: Colors.textPrimary,
    fontSize: FontSizes.md,
    fontWeight: '700',
  },
  emptySub: {
    color: Colors.textMuted,
    fontSize: FontSizes.sm,
    textAlign: 'center',
  },
});

