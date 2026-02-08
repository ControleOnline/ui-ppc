import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Card, Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import QueuesList from './QueuesList'; // ou importe QueueBlock diretamente

const iconByType = {
  products: 'silverware-fork-knife',
  orders: 'receipt-text',
  'products x orders': 'clipboard-check-outline',
};

type DisplayCardProps = {
  item: any; // melhore o tipo quando possível
  onPress: () => void;
};

export default function DisplayCard({ item, onPress }: DisplayCardProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.cardPressable,
        pressed && styles.cardPressed,
      ]}
    >
      <Card style={styles.displayCard}>
        <Card.Content style={styles.cardContent}>
          <MaterialCommunityIcons
            name={iconByType[item.displayType] || 'monitor'}
            size={44}
            color="#F5C542"
          />

          <Text style={styles.displayTitle}>{item.display}</Text>
          <Text style={styles.displayType}>({item.displayType})</Text>

          <QueuesList queues={item.displayQueue || []} />
          {/* Alternativa: map direto aqui se não quiser componente extra */}
        </Card.Content>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cardPressable: {
    flex: 1,
  },
  cardPressed: {
    opacity: 0.9,
  },
  displayCard: {
    flex: 1,
    minHeight: 240,
    borderRadius: 18,
    backgroundColor: '#1F1F2B',
    elevation: 5,
  },
  cardContent: {
    alignItems: 'center',
    paddingVertical: 22,
  },
  displayTitle: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  displayType: {
    fontSize: 13,
    color: '#B0B0B0',
    marginBottom: 12,
  },
});