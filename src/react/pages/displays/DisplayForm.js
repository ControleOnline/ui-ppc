import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TextInput,
  Pressable,
  ScrollView,
} from 'react-native';
import { useStore } from '@store';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useDisplayTheme } from '@controleonline/ui-ppc/src/react/theme/displayTheme';
import { useMessage } from '@controleonline/ui-common/src/react/components/MessageService';

export default function DisplayForm() {
  const route = useRoute();
  const navigation = useNavigation();
  const displaysStore = useStore('displays');
  const queuesStore = useStore('queues');
  const displayQueuesStore = useStore('display_queues');
  const statusStore = useStore('status');
  const peopleStore = useStore('people');
  const messageApi = useMessage();

  const { currentCompany } = peopleStore.getters;
  const { display, display_type } = route.params || {};
  const { ppcColors } = useDisplayTheme();
  const styles = useMemo(() => createStyles(ppcColors), [ppcColors]);

  const [displayValue, setDisplayValue] = useState(display?.display || '');
  const [type, setType] = useState(display?.display_type || display_type || 'orders');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const showErrorToast = useCallback(
    (message) => {
      if (typeof messageApi?.showError === 'function') {
        messageApi.showError(message);
        return;
      }
      if (typeof messageApi?.showToast === 'function') {
        messageApi.showToast(message, { position: 'top', offsetTop: 86 });
      }
    },
    [messageApi],
  );

  const showWarningToast = useCallback(
    (message) => {
      if (typeof messageApi?.showWarning === 'function') {
        messageApi.showWarning(message);
        return;
      }
      if (typeof messageApi?.showToast === 'function') {
        messageApi.showToast(message, { position: 'top', offsetTop: 86 });
      }
    },
    [messageApi],
  );

  const getId = (value) => {
    if (!value) return null;
    if (typeof value === 'number') return value;
    if (typeof value === 'string') return Number(value.replace(/\D/g, '')) || null;
    if (value.id) return value.id;
    if (value['@id']) return Number(String(value['@id']).replace(/\D/g, '')) || null;
    return null;
  };

  const ensureProductQueueLink = useCallback(
    async (savedDisplay) => {
      const displayId = getId(savedDisplay);
      if (!displayId || !currentCompany?.id) return;

      let statuses = [];
      try {
        statuses = await statusStore.actions.getItems({ context: 'display' });
      } catch (e) {
        statuses = [];
      }

      const statusByReal = (key) =>
        statuses.find((status) =>
          String(status?.realStatus || '')
            .toLowerCase()
            .includes(key),
        );

      const statusIn = statusByReal('in') || statuses[0];
      const statusWorking = statusByReal('working') || statuses[1] || statuses[0];
      const statusOut = statusByReal('out') || statuses[2] || statuses[1] || statuses[0];

      const queueName = displayValue?.trim() || `Fila ${displayId}`;
      const queuePayload = {
        queue: queueName,
        company: `/people/${currentCompany.id}`,
      };
      if (statusIn?.['@id']) queuePayload.status_in = statusIn['@id'];
      if (statusWorking?.['@id']) queuePayload.status_working = statusWorking['@id'];
      if (statusOut?.['@id']) queuePayload.status_out = statusOut['@id'];

      const createdQueue = await queuesStore.actions.save(queuePayload);
      const queueId = getId(createdQueue);
      if (!queueId) {
        throw new Error('Nao foi possivel criar a fila padrao do display');
      }

      await displayQueuesStore.actions.save({
        display: `/displays/${displayId}`,
        queue: `/queues/${queueId}`,
      });
    },
    [
      currentCompany?.id,
      displayQueuesStore.actions,
      displayValue,
      queuesStore.actions,
      statusStore.actions,
    ],
  );

  const saveDisplay = useCallback(async () => {
    if (!displayValue?.trim()) {
      setFormError('Informe um nome para o display.');
      return;
    }
    if (!currentCompany?.id) {
      setFormError('Empresa nao encontrada.');
      return;
    }

    setFormError('');
    setSaving(true);
    try {
      const savedDisplay = await displaysStore.actions.save({
        id: display?.id,
        display: displayValue.trim(),
        displayType: type,
        company: `/people/${currentCompany.id}`,
      });

      if (!display?.id && type === 'products') {
        try {
          await ensureProductQueueLink(savedDisplay);
        } catch (linkErr) {
          showWarningToast(
            'Display criado, mas a fila nao foi vinculada automaticamente. Tente novamente.',
          );
        }
      }

      navigation.goBack();
    } catch (err) {
      const message = err?.message || 'Nao foi possivel salvar o display.';
      setFormError(message);
      showErrorToast(message);
    } finally {
      setSaving(false);
    }
  }, [
    currentCompany,
    display,
    displayValue,
    displaysStore.actions,
    ensureProductQueueLink,
    navigation,
    showErrorToast,
    showWarningToast,
    type,
  ]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.formCard}>
        <View style={styles.header}>
          <Text style={styles.title}>{display ? 'Editar Display' : 'Novo Display'}</Text>
          <Text style={styles.subtitle}>Configure nome e tipo do painel de producao</Text>
        </View>

        <Text style={styles.label}>Display</Text>
        <TextInput
          style={styles.input}
          value={displayValue}
          onChangeText={(value) => {
            setDisplayValue(value);
            if (formError) setFormError('');
          }}
          placeholder="Digite o display"
          placeholderTextColor={ppcColors.textSecondary}
        />

        <Text style={styles.label}>Tipo</Text>
        <View style={styles.typesWrapper}>
          {['orders', 'products'].map((t) => (
            <Pressable
              key={t}
              style={[styles.typeButton, type === t && styles.typeButtonSelected]}
              onPress={() => setType(t)}
            >
              <Text style={type === t ? styles.typeTextSelected : styles.typeText}>
                {t}
              </Text>
            </Pressable>
          ))}
        </View>

        <Pressable
          style={[
            styles.saveButton,
            (!displayValue?.trim() || saving) && styles.saveButtonDisabled,
          ]}
          onPress={saveDisplay}
          disabled={saving}
        >
          <Text style={styles.saveButtonText}>
            {saving ? 'Salvando...' : display ? 'Atualizar' : 'Criar'}
          </Text>
        </Pressable>

        {!!formError && <Text style={styles.errorText}>{formError}</Text>}

        {type === 'products' && (
          <View style={styles.hintBox}>
            <Text style={styles.hintText}>
              Dica: displays de produtos dependem de fila/status vinculados para liberar o botao de adicionar produtos.
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const createStyles = (ppcColors) =>
  StyleSheet.create({
    container: {
      minHeight: '100%',
      padding: 16,
      backgroundColor: ppcColors.appBg,
      justifyContent: 'center',
    },
    formCard: {
      width: '100%',
      maxWidth: 760,
      alignSelf: 'center',
      borderRadius: 18,
      borderWidth: 1,
      borderColor: ppcColors.border,
      backgroundColor: ppcColors.cardBg,
      padding: 18,
      shadowColor: '#000',
      shadowOpacity: 0.24,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 10 },
      elevation: 8,
    },
    header: {
      borderBottomWidth: 1,
      borderBottomColor: ppcColors.border,
      paddingBottom: 10,
      marginBottom: 14,
    },
    title: {
      color: ppcColors.textPrimary,
      fontSize: 28,
      lineHeight: 32,
      fontWeight: '900',
    },
    subtitle: {
      marginTop: 4,
      color: ppcColors.textSecondary,
      fontSize: 13,
      fontWeight: '700',
    },
    label: {
      fontWeight: '800',
      marginBottom: 8,
      color: ppcColors.textPrimary,
      fontSize: 14,
    },
    input: {
      backgroundColor: ppcColors.cardBgSoft,
      color: ppcColors.textPrimary,
      borderWidth: 1,
      borderColor: ppcColors.border,
      padding: 12,
      borderRadius: 12,
      marginBottom: 14,
    },
    typesWrapper: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 18,
    },
    typeButton: {
      minWidth: 120,
      paddingVertical: 9,
      paddingHorizontal: 16,
      backgroundColor: ppcColors.cardBgSoft,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: ppcColors.border,
      alignItems: 'center',
    },
    typeButtonSelected: {
      backgroundColor: ppcColors.accent,
      borderColor: ppcColors.accent,
    },
    typeText: {
      color: ppcColors.textPrimary,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.4,
      fontSize: 12,
    },
    typeTextSelected: {
      color: ppcColors.pillTextDark,
      fontWeight: '900',
      textTransform: 'uppercase',
      letterSpacing: 0.4,
      fontSize: 12,
    },
    saveButton: {
      backgroundColor: ppcColors.accent,
      padding: 12,
      borderRadius: 12,
      alignItems: 'center',
    },
    saveButtonDisabled: {
      opacity: 0.6,
    },
    saveButtonText: {
      color: ppcColors.pillTextDark,
      fontWeight: '900',
      fontSize: 15,
    },
    errorText: {
      marginTop: 10,
      color: ppcColors.dangerText,
      fontSize: 13,
      fontWeight: '700',
    },
    hintBox: {
      marginTop: 12,
      borderWidth: 1,
      borderColor: ppcColors.border,
      borderRadius: 12,
      backgroundColor: ppcColors.cardBgSoft,
      paddingVertical: 10,
      paddingHorizontal: 12,
    },
    hintText: {
      color: ppcColors.textSecondary,
      fontSize: 12,
      fontWeight: '600',
      lineHeight: 17,
    },
  });
