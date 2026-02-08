import React from 'react';
import { View, StyleSheet } from 'react-native';
import QueueBlock from './QueueBlock';

type QueuesListProps = {
  queues: Array<any>; // ajuste o tipo conforme sua interface real
};

export default function QueuesList({ queues }: QueuesListProps) {
  if (!queues?.length) return null;

  return (
    <View style={styles.queuesWrapper}>
      {queues.map((dq) => (
        <QueueBlock key={dq.queue.id} queue={dq.queue} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  queuesWrapper: {
    width: '100%',
    alignItems: 'center',
    marginTop: 6,
  },
});