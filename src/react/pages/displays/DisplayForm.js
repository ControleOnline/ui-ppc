import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Alert,
} from 'react-native';
import { useStore } from '@store';
import { useRoute, useNavigation } from '@react-navigation/native';

export default function DisplayForm() {
  const route = useRoute();
  const navigation = useNavigation();
  const displaysStore = useStore('displays');
  const queuesStore = useStore('queues');
  const displayQueuesStore = useStore('display_queues');
  const statusStore = useStore('status');
  const peopleStore = useStore('people');

  const { currentCompany } = peopleStore.getters;
  const { display, display_type } = route.params || {};

  const [displayValue, setDisplayValue] = useState(display?.display || '');
  const [type, setType] = useState(display?.display_type || display_type || 'orders');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

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
            .includes(key)
        );

      const statusIn = statusByReal('in') || statuses[0];
      const statusWorking = statusByReal('working') || statuses[1] || statuses[0];
      const statusOut = statusByReal('out') || statuses[2] || statuses[1] || statuses[0];

      const queueName = displayValue?.trim() || `Fila ${displayId}`;
      const queuePayload = {
        queue: queueName,
        company: '/people/' + currentCompany.id,
      };
      if (statusIn?.['@id']) queuePayload.status_in = statusIn['@id'];
      if (statusWorking?.['@id']) queuePayload.status_working = statusWorking['@id'];
      if (statusOut?.['@id']) queuePayload.status_out = statusOut['@id'];

      const createdQueue = await queuesStore.actions.save(queuePayload);

      const queueId = getId(createdQueue);
      if (!queueId) throw new Error('Não foi possível criar a fila padrão do display');

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
    ]
  );

  const saveDisplay = useCallback(async () => {
    if (!displayValue?.trim()) {
      setFormError('Informe um nome para o display.');
      return;
    }
    if (!currentCompany?.id) {
      setFormError('Empresa não encontrada.');
      return;
    }

    setFormError('');
    setSaving(true);
    try {
      const savedDisplay = await displaysStore.actions.save({
        id: display?.id,
        display: displayValue.trim(),
        displayType: type,
        company: '/people/' + currentCompany.id,
      });

      if (!display?.id && type === 'products') {
        try {
          await ensureProductQueueLink(savedDisplay);
        } catch (linkErr) {
          Alert.alert(
            'Atenção',
            'Display criado, mas a fila não foi vinculada automaticamente. Tente novamente.'
          );
        }
      }

      navigation.goBack();
    } catch (err) {
      setFormError(err?.message || 'Não foi possível salvar o display.');
      Alert.alert('Erro', err.message || 'Não foi possível salvar o display');
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
    type,
  ]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.label}>Display</Text>
      <TextInput
        style={styles.input}
        value={displayValue}
        onChangeText={(value) => {
          setDisplayValue(value);
          if (formError) setFormError('');
        }}
        placeholder="Digite o display"
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
        <Text style={styles.hintText}>
          Dica: o display de produtos depende de fila/status já vinculados para exibir o botão de adicionar produtos.
        </Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#ECEFF1',
    gap: 16,
  },
  label: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
  },
  typesWrapper: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  typeButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  typeButtonSelected: {
    backgroundColor: '#2196F3',
    borderColor: '#1976D2',
  },
  typeText: {
    color: '#000',
  },
  typeTextSelected: {
    color: '#fff',
    fontWeight: 'bold',
  },
  saveButton: {
    backgroundColor: '#2196F3',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  errorText: {
    color: '#B42318',
    fontSize: 13,
    fontWeight: '600',
  },
  hintText: {
    color: '#475467',
    fontSize: 12,
  },
});
