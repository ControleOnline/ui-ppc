import React, { useState, useMemo } from 'react';
import { View, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Text, Button, RadioButton } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useStore } from '@store';
import { env } from '@env';
import { usePpcTheme } from '@controleonline/ui-ppc/src/react/theme/ppcTheme';
import AnimatedModal from '@controleonline/ui-crm/src/react/components/AnimatedModal';
import { withOpacity } from '@controleonline/../../src/styles/branding';

export default function QueueBlock({
  queue,
  onQueueUpdate,
  ppcColorsOverride = null,
}) {
  const navigation = useNavigation();
  const statusStore = useStore('status');
  const queueStore = useStore('queues');
  const { actions: actionsQueue } = queueStore;
  const { actions } = statusStore;
  const { ppcColors: defaultPpcColors } = usePpcTheme();
  const ppcColors = ppcColorsOverride || defaultPpcColors;
  const styles = useMemo(() => createStyles(ppcColors), [ppcColors]);

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState(null);
  const [statusList, setStatusList] = useState([]);
  const [editingType, setEditingType] = useState(null);
  const [loadingStatuses, setLoadingStatuses] = useState(false);

  const handleEditClick = async (statusObj, type) => {
    setLoadingStatuses(true);
    try {
      const fetched = await actions.getItems({ context: 'display' });
      const source = Array.isArray(fetched) ? fetched : [];
      const formatted = source.map((s) => ({
        id: s.id,
        name: s.status,
        color: s.color,
        realStatus: s.realStatus,
        '@id': s['@id'],
      }));

      setStatusList(formatted);
      const current = formatted.find((s) => String(s.id) === String(statusObj?.id));
      setSelectedStatus(current || null);
      setEditingType(type);
      setModalVisible(true);
    } finally {
      setLoadingStatuses(false);
    }
  };

  const saveStatus = () => {
    if (!selectedStatus) return;

    actionsQueue
      .save({
        id: queue.id,
        [
          editingType === 'in'
            ? 'status_in'
            : editingType === 'working'
              ? 'status_working'
              : 'status_out'
        ]: selectedStatus['@id'],
      })
      .then(() => {
        const updatedQueue = { ...queue };
        if (editingType === 'in') updatedQueue.status_in = selectedStatus;
        else if (editingType === 'working') updatedQueue.status_working = selectedStatus;
        else updatedQueue.status_out = selectedStatus;

        onQueueUpdate(updatedQueue);
        setModalVisible(false);
      });
  };

  const renderStatus = (statusObj, type) => {
    if (!statusObj) return null;

    const statusName = String(statusObj.name || statusObj.status || '').trim();
    const statusLabel = statusName ? statusName.split(' ')[0] : '-';

    return (
      <View style={styles.statusPill}>
        <View style={[styles.statusDot, { backgroundColor: statusObj.color || '#64748B' }]} />
        <Text style={styles.statusText}>{statusLabel}</Text>
        {env.APP_TYPE === 'MANAGER' && (
          <Pressable onPress={() => handleEditClick(statusObj, type)} style={styles.editButton}>
            <MaterialCommunityIcons
              name="pencil"
              size={9}
              color={ppcColors.textSecondary}
            />
          </Pressable>
        )}
      </View>
    );
  };

  return (
    <View style={styles.queueBlock}>
      <View style={styles.titleRow}>
        <Text style={styles.queueTitle}>{queue.queue}</Text>
        {env.APP_TYPE === 'MANAGER' && (
          <Pressable
            style={styles.addButton}
            onPress={() =>
              navigation.navigate('QueueAddProducts', {
                queueId: queue?.id,
                queueName: queue?.queue,
              })
            }
          >
            <Text style={styles.addIcon}>+</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.statusPillsRow}>
        {renderStatus(queue.status_in, 'in')}
        {renderStatus(queue.status_working, 'working')}
        {renderStatus(queue.status_out, 'out')}
      </View>

      <AnimatedModal
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
        style={{ justifyContent: 'flex-end' }}
      >
        <View style={styles.editSheetRoot}>
          <Pressable style={styles.editSheetBackdrop} onPress={() => setModalVisible(false)} />
          <View style={styles.editSheetWrap}>
            <View style={styles.editSheetHandle} />
            <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderRow}>
                <View style={styles.modalHeaderTextWrap}>
                  <Text style={styles.modalTitle}>Selecione o status</Text>
                  <Text style={styles.modalSubtitle}>Atualize a etapa desta fila</Text>
                </View>
                <Pressable onPress={() => setModalVisible(false)} style={styles.modalCloseButton}>
                  <MaterialCommunityIcons name="close" size={18} color={ppcColors.textSecondary} />
                </Pressable>
              </View>
            </View>

            <ScrollView style={styles.statusList}>
              {loadingStatuses ? (
                <Text style={styles.loadingText}>Carregando status...</Text>
              ) : statusList.length === 0 ? (
                <Text style={styles.loadingText}>Nenhum status disponivel.</Text>
              ) : (
                <RadioButton.Group
                  onValueChange={(value) => {
                    const selected = statusList.find((s) => String(s.id) === String(value));
                    setSelectedStatus(selected);
                  }}
                  value={selectedStatus?.id}
                >
                  {statusList.map((item) => (
                    <View
                      key={item.id}
                      style={[
                        styles.radioItemWrap,
                        String(selectedStatus?.id) === String(item.id) &&
                          styles.radioItemWrapSelected,
                      ]}
                    >
                      <View
                        style={[
                          styles.modalStatusDot,
                          { backgroundColor: item.color || '#64748B' },
                        ]}
                      />
                      <RadioButton.Item
                        label={item.name}
                        value={item.id}
                        color={ppcColors.accent}
                        uncheckedColor={ppcColors.borderSoft}
                        labelStyle={styles.radioLabel}
                        style={styles.radioItem}
                      />
                    </View>
                  ))}
                </RadioButton.Group>
              )}
            </ScrollView>

            <Button
              mode="contained"
              onPress={saveStatus}
              style={styles.modalSaveButton}
              buttonColor={ppcColors.accent}
              textColor={ppcColors.pillTextDark}
            >
              Salvar
            </Button>
            <Button
              onPress={() => setModalVisible(false)}
              style={styles.modalCancelButton}
              textColor={ppcColors.textSecondary}
            >
              Cancelar
            </Button>
          </View>
        </View>
      </View>
      </AnimatedModal>
    </View>
  );
}

const createStyles = (ppcColors) =>
  StyleSheet.create({
    queueBlock: { alignItems: 'center', marginTop: 2, width: '100%' },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
      justifyContent: 'center',
    },
    queueTitle: {
      backgroundColor: ppcColors.accent,
      color: ppcColors.pillTextDark,
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: 999,
      fontSize: 12,
      fontWeight: '900',
      textTransform: 'uppercase',
      letterSpacing: 0.3,
    },
    addButton: {
      width: 24,
      height: 24,
      borderRadius: 999,
      backgroundColor: ppcColors.accent,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: 6,
    },
    statusPillsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      flexWrap: 'wrap',
      width: '100%',
    },
    statusPill: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 999,
      borderWidth: 1,
      borderColor: ppcColors.border,
      backgroundColor: ppcColors.cardBgSoft,
      paddingHorizontal: 9,
      paddingVertical: 4,
      marginHorizontal: 3,
      marginBottom: 6,
      minWidth: 84,
      justifyContent: 'center',
    },
    statusDot: {
      width: 8,
      height: 8,
      borderRadius: 99,
      marginRight: 7,
    },
    statusText: {
      fontSize: 12,
      color: ppcColors.textSecondary,
      textAlign: 'center',
      fontWeight: '800',
      textTransform: 'capitalize',
    },
    editButton: {
      marginLeft: 6,
      width: 15,
      height: 15,
      borderRadius: 999,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: ppcColors.border,
    },
    addIcon: { fontSize: 14, color: ppcColors.textDark, fontWeight: '900', lineHeight: 14 },
    editSheetRoot: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    editSheetBackdrop: {
      flex: 1,
      backgroundColor: withOpacity(ppcColors.overlay || '#0F172A', 0.55),
    },
    editSheetWrap: {
      paddingHorizontal: 0,
      paddingBottom: 10,
    },
    editSheetHandle: {
      alignSelf: 'center',
      width: 54,
      height: 5,
      borderRadius: 999,
      backgroundColor: withOpacity(ppcColors.textSecondary, 0.24),
      marginBottom: 6,
    },
    modalContent: {
      width: '100%',
      maxHeight: '88%',
      backgroundColor: ppcColors.modalBg || ppcColors.cardBg,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: 18,
      paddingTop: 16,
      paddingBottom: 20,
      borderTopWidth: 1,
      borderColor: ppcColors.border,
      shadowColor: '#000',
      shadowOpacity: 0.08,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: -3 },
      elevation: 8,
    },
    modalHeader: {
      paddingBottom: 10,
      marginBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: ppcColors.border,
    },
    modalHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
    },
    modalHeaderTextWrap: {
      flex: 1,
    },
    modalCloseButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: ppcColors.border,
      backgroundColor: ppcColors.cardBgSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalTitle: { fontSize: 20, fontWeight: '800', color: ppcColors.textPrimary },
    modalSubtitle: {
      marginTop: 3,
      fontSize: 12,
      color: ppcColors.textSecondary,
      fontWeight: '600',
    },
    statusList: {
      maxHeight: 320,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: ppcColors.border,
      backgroundColor: ppcColors.cardBgSoft,
      paddingHorizontal: 6,
      paddingVertical: 4,
    },
    radioItemWrap: {
      marginVertical: 4,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: 'transparent',
      backgroundColor: ppcColors.cardBg,
      flexDirection: 'row',
      alignItems: 'center',
      paddingLeft: 10,
    },
    radioItemWrapSelected: {
      borderColor: ppcColors.accent,
      backgroundColor: ppcColors.cardBgSoft,
    },
    modalStatusDot: {
      width: 8,
      height: 8,
      borderRadius: 99,
      marginRight: 4,
    },
    radioItem: {
      flex: 1,
      paddingLeft: 0,
    },
    radioLabel: {
      color: ppcColors.textPrimary,
      fontWeight: '700',
      fontSize: 14,
    },
    loadingText: {
      color: ppcColors.textSecondary,
      fontWeight: '600',
      fontSize: 13,
      paddingHorizontal: 10,
      paddingVertical: 12,
    },
    modalSaveButton: {
      marginTop: 12,
      borderRadius: 12,
    },
    modalCancelButton: {
      marginTop: 4,
      borderRadius: 12,
    },
  });
