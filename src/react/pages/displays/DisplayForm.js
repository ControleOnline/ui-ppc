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
  const peopleStore = useStore('people');

  const { currentCompany } = peopleStore.getters;
  const { display, display_type } = route.params || {};

  const [displayValue, setDisplayValue] = useState(display?.display || '');
  const [type, setType] = useState(display?.display_type || display_type || 'orders');
  const [saving, setSaving] = useState(false);

  const saveDisplay = useCallback(async () => {
    if (!displayValue) return Alert.alert('Erro', 'O display é obrigatório');
    if (!currentCompany?.id) return Alert.alert('Erro', 'Empresa não encontrada');

    setSaving(true);
    try {
      await displaysStore.actions.save({
        id: display?.id,
        display: displayValue,
        displayType: type,
        company: '/people/' + currentCompany.id,
      });
      navigation.goBack();
    } catch (err) {
      Alert.alert('Erro', err.message || 'Não foi possível salvar o display');
    } finally {
      setSaving(false);
    }
  }, [displayValue, type, display, currentCompany, displaysStore.actions, navigation]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.label}>Display</Text>
      <TextInput
        style={styles.input}
        value={displayValue}
        onChangeText={setDisplayValue}
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
        style={[styles.saveButton, saving && styles.saveButtonDisabled]}
        onPress={saveDisplay}
        disabled={saving}
      >
        <Text style={styles.saveButtonText}>{display ? 'Atualizar' : 'Criar'}</Text>
      </Pressable>
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
});
