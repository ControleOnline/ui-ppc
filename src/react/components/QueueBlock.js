import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';

type QueueProps = {
  queue: {
    id: string | number;
    queue: string;
    status_in?: { status: string };
    status_working?: { status: string };
    status_out?: { status: string };
  };
};

export default function QueueBlock({ queue }: QueueProps) {
  return (
    <View style={styles.queueBlock}>
      <Text style={styles.queueTitle}>{queue.queue}</Text>

      {queue.status_in && (
        <Text style={styles.statusText}>{queue.status_in.status}</Text>
      )}

      {queue.status_working && (
        <Text style={styles.statusText}>{queue.status_working.status}</Text>
      )}

      {queue.status_out && (
        <Text style={styles.statusText}>{queue.status_out.status}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  queueBlock: {
    alignItems: 'center',
    marginTop: 10,
  },
  queueTitle: {
    backgroundColor: '#F5C542',
    color: '#000000',
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 14,
    marginBottom: 6,
    fontSize: 13,
    fontWeight: '600',
  },
  statusText: {
    fontSize: 13,
    color: '#E0E0E0',
    marginVertical: 1,
    textAlign: 'center',
  },
});