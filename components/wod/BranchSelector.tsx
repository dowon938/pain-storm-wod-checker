import { createStore } from '@/lib/create-auto-store';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import React from 'react';
import { Modal, Pressable, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

enum PerferBranch {
  ALL = 'ALL',
  APGUJEONG = '압구정',
  JAMSIL = '잠실',
  SUWON = '수원',
  ACHASAN = '아차산',
}

export const { readPerferBranch, updatePerferBranch, useWatchPerferBranch } =
  createStore({
    perferBranch: PerferBranch.ALL,
  });

const BranchSelector = () => {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = React.useState(false);
  const perferBranch = useWatchPerferBranch();

  const options: { label: string; value: PerferBranch }[] = [
    { label: '전체', value: PerferBranch.ALL },
    { label: '압구정', value: PerferBranch.APGUJEONG },
    { label: '잠실', value: PerferBranch.JAMSIL },
    { label: '수원', value: PerferBranch.SUWON },
    { label: '아차산', value: PerferBranch.ACHASAN },
  ];

  const currentLabel =
    options.find((o) => o.value === perferBranch)?.label ?? '전체';

  return (
    <>
      <TouchableOpacity
        onPress={() => setOpen(true)}
        style={{
          borderRadius: 8,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
        }}
        activeOpacity={0.7}
      >
        <Text style={{ fontSize: 16, fontWeight: '500', color: 'white' }}>
          {currentLabel}
        </Text>
        <FontAwesome6 name='angle-down' size={16} color='gray' />
      </TouchableOpacity>
      <Modal
        visible={open}
        transparent
        animationType='fade'
        onRequestClose={() => setOpen(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.2)' }}
          onPress={() => setOpen(false)}
        >
          <View
            style={{
              position: 'absolute',
              top: insets.top + 24,
              right: 12,
              backgroundColor: 'white',
              borderRadius: 12,
              padding: 6,
              shadowColor: '#000',
              shadowOpacity: 0.15,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 6 },
              elevation: 4,
              minWidth: 112,
            }}
          >
            {options.map((opt) => {
              const selected = opt.value === perferBranch;
              return (
                <TouchableOpacity
                  key={opt.value}
                  activeOpacity={0.7}
                  onPress={() => {
                    updatePerferBranch(opt.value);
                    setOpen(false);
                  }}
                  style={{
                    paddingVertical: 10,
                    paddingHorizontal: 14,
                    borderRadius: 8,
                    backgroundColor: selected
                      ? 'rgba(0,0,0,0.08)'
                      : 'transparent',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8,
                  }}
                >
                  <Text style={{ color: '#111827', fontSize: 14 }}>
                    {opt.label}
                  </Text>
                  {selected ? (
                    <FontAwesome5
                      name='check'
                      size={16}
                      color='rgba(0,0,0,0.9)'
                    />
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </View>
        </Pressable>
      </Modal>
    </>
  );
};

export default BranchSelector;
