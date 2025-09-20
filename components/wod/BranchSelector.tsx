import { hapticLight } from '@/hooks/haptic';
import { createStore } from '@/lib/create-auto-store';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import React from 'react';
import { Modal, Pressable, Text, TouchableOpacity, View } from 'react-native';
import { MMKV } from 'react-native-mmkv';
import Animated, { LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
const storage = new MMKV();
const PREF_PERFER_BRANCH = 'perferBranch';

const AnimatedTouchableOpacity =
  Animated.createAnimatedComponent(TouchableOpacity);

export enum PerferBranch {
  ALL = 'ALL',
  APGUJEONG = '압구정',
  JAMSIL = '잠실',
  SUWON = '수원',
  ACHASAN = '아차산',
  ALL_AT_ONCE = 'ALL_AT_ONCE',
}

export const { readPerferBranch, updatePerferBranch, useWatchPerferBranch } =
  createStore({
    perferBranch: storage.getString(PREF_PERFER_BRANCH) ?? PerferBranch.ALL,
  });

const BranchSelector = () => {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = React.useState(false);
  const buttonRef = React.useRef<View>(null);
  const [anchor, setAnchor] = React.useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const perferBranch = useWatchPerferBranch();

  const options: { label: string; value: PerferBranch }[] = [
    { label: '기본순', value: PerferBranch.ALL },
    { label: '압구정', value: PerferBranch.APGUJEONG },
    { label: '잠실', value: PerferBranch.JAMSIL },
    { label: '수원', value: PerferBranch.SUWON },
    { label: '아차산', value: PerferBranch.ACHASAN },
    { label: '한 번에 보기', value: PerferBranch.ALL_AT_ONCE },
  ];

  const currentLabel =
    options.find((o) => o.value === perferBranch)?.label ?? '전체';

  const MENU_MIN_WIDTH = 112;

  return (
    <>
      <AnimatedTouchableOpacity
        layout={LinearTransition.springify()
          .stiffness(150)
          .damping(10)
          .duration(800)}
        ref={buttonRef}
        onPress={() => {
          buttonRef.current?.measureInWindow?.((x, y, width, height) => {
            hapticLight();
            setAnchor({ x, y, width, height });
            setOpen(true);
          });
        }}
        hitSlop={16}
        style={{
          marginLeft: 8,
          marginTop: 1,
          backgroundColor: 'black',
          paddingHorizontal: 9,
          paddingVertical: 6,
          paddingRight: 7,
          borderWidth: 1,
          borderColor: 'white',
          borderRadius: 20,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 3,
        }}
        activeOpacity={0.7}
      >
        <Text style={{ fontSize: 14, fontWeight: '500', color: 'white' }}>
          {currentLabel}
        </Text>
        <FontAwesome6 name='angle-down' size={12} color='white' />
      </AnimatedTouchableOpacity>
      <Modal
        visible={open}
        transparent
        animationType='fade'
        onRequestClose={() => setOpen(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.25)' }}
          onPress={() => setOpen(false)}
        >
          <View
            style={{
              position: 'absolute',
              top: anchor
                ? Math.max(insets.top + 8, anchor.y + anchor.height + 6)
                : insets.top + 20,
              left: anchor ? anchor.x : undefined,
              right: anchor ? undefined : 8,
              backgroundColor: 'white',
              borderWidth: 0.5,
              borderColor: 'rgba(0,0,0,0.4)',
              borderRadius: 12,
              padding: 6,
              shadowColor: '#000',
              shadowOpacity: 0.15,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 6 },
              elevation: 4,
              minWidth: MENU_MIN_WIDTH,
            }}
          >
            <Text
              style={{
                color: '#6b7280',
                fontSize: 12,
                paddingHorizontal: 8,
                paddingVertical: 6,
              }}
            >
              선택한 지점이 먼저 표시돼요.
            </Text>
            {options.map((opt) => {
              const selected = opt.value === perferBranch;
              return (
                <TouchableOpacity
                  key={opt.value}
                  activeOpacity={0.7}
                  onPress={() => {
                    hapticLight();
                    updatePerferBranch(opt.value);
                    storage.set(PREF_PERFER_BRANCH, opt.value);
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
