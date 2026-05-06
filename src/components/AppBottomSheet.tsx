import {
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
  BottomSheetModal,
  type BottomSheetModalProps,
  BottomSheetScrollView,
  type BottomSheetModal as BottomSheetModalType,
} from '@gorhom/bottom-sheet';
import { forwardRef, type ReactNode, useCallback, useMemo } from 'react';
import { Platform, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useColorScheme } from '~/hooks/useColorScheme';
import { palette } from '~/theme/tokens';

/**
 * AppBottomSheet — wrapper sobre @gorhom/bottom-sheet con animación
 * nativa pro: gesture-driven, snap points, backdrop oscurecido,
 * handle drag con física suave.
 *
 * Uso:
 *   const ref = useRef<BottomSheetMethods>(null);
 *   <AppBottomSheet ref={ref} snapPoints={['50%','90%']}>
 *     <Text>Contenido</Text>
 *   </AppBottomSheet>
 *   ref.current?.present();
 */

export interface BottomSheetMethods {
  present: () => void;
  dismiss: () => void;
  snapToIndex: (index: number) => void;
}

interface AppBottomSheetProps extends Partial<BottomSheetModalProps> {
  children: ReactNode;
  snapPoints?: (string | number)[];
  enablePanDownToClose?: boolean;
  /** Si true, el contenido va dentro de BottomSheetScrollView */
  scroll?: boolean;
}

export const AppBottomSheet = forwardRef<BottomSheetModalType, AppBottomSheetProps>(
  function AppBottomSheet(
    { children, snapPoints, enablePanDownToClose = true, scroll = false, ...rest },
    ref,
  ) {
    const scheme = useColorScheme();
    const colors = palette[scheme];
    const insets = useSafeAreaInsets();

    const points = useMemo(() => snapPoints ?? ['65%', '92%'], [snapPoints]);

    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop
          {...props}
          appearsOnIndex={0}
          disappearsOnIndex={-1}
          opacity={0.55}
          pressBehavior="close"
        />
      ),
      [],
    );

    return (
      <BottomSheetModal
        ref={ref}
        snapPoints={points}
        enablePanDownToClose={enablePanDownToClose}
        backdropComponent={renderBackdrop}
        backgroundStyle={{
          backgroundColor: colors.bgElevated,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
        }}
        handleIndicatorStyle={{
          backgroundColor: colors.borderStrong,
          width: 40,
          height: 4,
        }}
        handleStyle={{
          paddingTop: 10,
          paddingBottom: 4,
        }}
        keyboardBehavior={Platform.OS === 'ios' ? 'extend' : 'interactive'}
        keyboardBlurBehavior="restore"
        android_keyboardInputMode="adjustResize"
        {...rest}
      >
        {scroll ? (
          <BottomSheetScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
          >
            {children}
          </BottomSheetScrollView>
        ) : (
          <View style={{ flex: 1, paddingBottom: insets.bottom + 16 }}>{children}</View>
        )}
      </BottomSheetModal>
    );
  },
);
