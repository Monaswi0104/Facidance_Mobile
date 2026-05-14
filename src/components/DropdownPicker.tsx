import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ScrollView,
  Dimensions,
} from "react-native";
import { ChevronDown } from "lucide-react-native";

interface DropdownItem {
  label: string;
  value: any;
}

interface DropdownPickerProps {
  selectedValue: any;
  onValueChange: (value: any) => void;
  items: DropdownItem[];
  placeholder?: string;
  colors: any;
  style?: any;
}

/**
 * Cross-platform dropdown picker using a custom Modal + ScrollView list.
 * Works identically on iOS and Android — no native Picker dependency.
 */
export default function DropdownPicker({
  selectedValue,
  onValueChange,
  items,
  placeholder = "Select...",
  colors,
  style,
}: DropdownPickerProps) {
  const [visible, setVisible] = useState(false);

  const selectedLabel =
    items.find((i) => i.value === selectedValue)?.label || placeholder;
  const isPlaceholder = selectedValue == null;

  return (
    <>
      {/* Trigger */}
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => setVisible(true)}
        style={[
          {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: colors.secondary,
            borderRadius: 8,
            paddingHorizontal: 12,
            height: 54,
            borderWidth: 1,
            borderColor: colors.border,
          },
          style,
        ]}
      >
        <Text
          style={{
            flex: 1,
            fontSize: 13,
            color: isPlaceholder ? colors.mutedForeground : colors.foreground,
          }}
          numberOfLines={1}
        >
          {selectedLabel}
        </Text>
        <ChevronDown size={14} color={colors.mutedForeground} />
      </TouchableOpacity>

      {/* Modal List */}
      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
        <View style={[modalStyles.overlay]}>
          <View style={[modalStyles.content, { backgroundColor: colors.background }]}>
            <Text style={[modalStyles.title, { color: colors.foreground }]}>
              {placeholder}
            </Text>

            <ScrollView style={{ maxHeight: Dimensions.get("window").height * 0.5 }}>
              {/* Placeholder / reset option */}
              <TouchableOpacity
                style={[
                  modalStyles.item,
                  { borderBottomColor: colors.muted },
                  selectedValue == null && { backgroundColor: colors.accentLight },
                ]}
                onPress={() => {
                  onValueChange(null);
                  setVisible(false);
                }}
              >
                <Text
                  style={[
                    modalStyles.itemText,
                    { color: colors.mutedForeground },
                  ]}
                >
                  {placeholder}
                </Text>
              </TouchableOpacity>

              {items.map((item) => (
                <TouchableOpacity
                  key={String(item.value)}
                  style={[
                    modalStyles.item,
                    { borderBottomColor: colors.muted },
                    selectedValue === item.value && { backgroundColor: colors.accentLight },
                  ]}
                  onPress={() => {
                    onValueChange(item.value);
                    setVisible(false);
                  }}
                >
                  <Text
                    style={[
                      modalStyles.itemText,
                      { color: colors.foreground },
                      selectedValue === item.value && { fontWeight: "700", color: colors.primaryDark },
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={[modalStyles.cancelBtn, { backgroundColor: colors.muted }]}
              onPress={() => setVisible(false)}
            >
              <Text style={[modalStyles.cancelText, { color: colors.mutedForeground }]}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 20,
  },
  content: {
    borderRadius: 16,
    padding: 20,
    maxHeight: "80%",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 16,
  },
  item: {
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderRadius: 6,
  },
  itemText: {
    fontSize: 15,
  },
  cancelBtn: {
    marginTop: 16,
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  cancelText: {
    fontSize: 15,
    fontWeight: "600",
  },
});
