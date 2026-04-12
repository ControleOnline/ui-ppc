import React, {useMemo} from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {useDisplayTheme} from '@controleonline/ui-ppc/src/react/theme/displayTheme';
import {getPrinterLabel} from '@controleonline/ui-common/src/react/utils/printerDevices';
import {normalizeDeviceId} from '@controleonline/ui-common/src/react/utils/paymentDevices';

const DisplayPrinterSelectionModal = ({
  visible = false,
  printers = [],
  selectedPrinterDeviceId = '',
  saving = false,
  onSelectPrinter = null,
  onClose = null,
  ppcColorsOverride = null,
}) => {
  const {ppcColors: defaultPpcColors} = useDisplayTheme();
  const ppcColors = ppcColorsOverride || defaultPpcColors;
  const styles = useMemo(() => createStyles(ppcColors), [ppcColors]);
  const normalizedSelectedPrinterDeviceId = normalizeDeviceId(
    selectedPrinterDeviceId,
  );

  const renderPrinterItem = ({item}) => {
    const printerDeviceId = normalizeDeviceId(item?.device);
    const isSelected =
      printerDeviceId !== '' &&
      printerDeviceId === normalizedSelectedPrinterDeviceId;

    return (
      <Pressable
        style={[styles.printerItem, isSelected && styles.printerItemSelected]}
        disabled={saving || typeof onSelectPrinter !== 'function'}
        onPress={() => onSelectPrinter?.(item)}>
        <View style={styles.printerCopy}>
          <Text style={styles.printerName}>{getPrinterLabel(item)}</Text>
          {!!printerDeviceId && (
            <Text style={styles.printerMeta}>{printerDeviceId}</Text>
          )}
        </View>

        {isSelected && <Text style={styles.printerBadge}>Atual</Text>}
      </Pressable>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Selecionar impressora</Text>
          <Text style={styles.description}>
            Escolha a impressora padrao deste KDS. A selecao sera salva na
            configuracao do device.
          </Text>

          {saving ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="small" color={ppcColors.accent} />
              <Text style={styles.loadingText}>Salvando impressora...</Text>
            </View>
          ) : null}

          {Array.isArray(printers) && printers.length > 0 ? (
            <FlatList
              data={printers}
              renderItem={renderPrinterItem}
              keyExtractor={item =>
                normalizeDeviceId(item?.device) || getPrinterLabel(item)
              }
              contentContainerStyle={styles.listContent}
            />
          ) : (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyText}>
                Nenhuma impressora disponivel para esta empresa.
              </Text>
            </View>
          )}

          <Pressable
            style={styles.closeButton}
            disabled={saving}
            onPress={onClose}>
            <Text style={styles.closeButtonText}>Fechar</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

const createStyles = ppcColors =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(2, 6, 23, 0.52)',
      paddingHorizontal: 18,
      justifyContent: 'center',
    },
    sheet: {
      borderRadius: 18,
      borderWidth: 1,
      borderColor: ppcColors.border,
      backgroundColor: ppcColors.cardBg,
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 14,
      maxHeight: '78%',
    },
    title: {
      color: ppcColors.textPrimary,
      fontSize: 19,
      lineHeight: 22,
      fontWeight: '900',
    },
    description: {
      marginTop: 6,
      color: ppcColors.textSecondary,
      fontSize: 13,
      lineHeight: 19,
      fontWeight: '600',
    },
    loadingWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 12,
      paddingVertical: 10,
    },
    loadingText: {
      marginLeft: 8,
      color: ppcColors.textSecondary,
      fontSize: 13,
      fontWeight: '700',
    },
    listContent: {
      paddingTop: 14,
      paddingBottom: 8,
      gap: 10,
    },
    printerItem: {
      borderRadius: 14,
      borderWidth: 1,
      borderColor: ppcColors.border,
      backgroundColor: ppcColors.cardBgSoft,
      paddingHorizontal: 13,
      paddingVertical: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    printerItemSelected: {
      borderColor: ppcColors.accent,
      backgroundColor: ppcColors.panelBg,
    },
    printerCopy: {
      flex: 1,
      paddingRight: 10,
    },
    printerName: {
      color: ppcColors.textPrimary,
      fontSize: 14,
      lineHeight: 18,
      fontWeight: '800',
    },
    printerMeta: {
      marginTop: 3,
      color: ppcColors.textSecondary,
      fontSize: 12,
      lineHeight: 16,
      fontWeight: '600',
    },
    printerBadge: {
      color: ppcColors.accent,
      fontSize: 12,
      lineHeight: 16,
      fontWeight: '900',
    },
    emptyWrap: {
      marginTop: 14,
      borderRadius: 14,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: ppcColors.borderSoft,
      backgroundColor: ppcColors.cardBgSoft,
      paddingHorizontal: 12,
      paddingVertical: 16,
    },
    emptyText: {
      color: ppcColors.textSecondary,
      fontSize: 13,
      lineHeight: 18,
      fontWeight: '600',
    },
    closeButton: {
      marginTop: 10,
      alignSelf: 'flex-end',
      borderRadius: 999,
      borderWidth: 1,
      borderColor: ppcColors.borderSoft,
      backgroundColor: ppcColors.panelBg,
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
    closeButtonText: {
      color: ppcColors.textPrimary,
      fontSize: 13,
      fontWeight: '800',
    },
  });

export default DisplayPrinterSelectionModal;
