import React, { useEffect, useMemo, useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Pressable,
} from "react-native";
import { useTranslation } from "react-i18next";
import { filterCountries, PHONE_COUNTRIES, type PhoneCountry } from "@workspace/phone-auth";
import { brand, brandAlpha } from "@/constants/colors";

type Props = {
  visible: boolean;
  selected: PhoneCountry;
  onSelect: (country: PhoneCountry) => void;
  onClose: () => void;
};

export default function CountryPickerModal({
  visible,
  selected,
  onSelect,
  onClose,
}: Props) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!visible) setQuery("");
  }, [visible]);

  const filtered = useMemo(
    () => filterCountries(PHONE_COUNTRIES, query),
    [query],
  );

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose}>
        <Pressable style={s.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={s.handle} />
          <TextInput
            style={s.search}
            value={query}
            onChangeText={setQuery}
            placeholder={t("components.phone_auth_flow.country_picker_search_placeholder")}
            placeholderTextColor="rgba(200,180,255,0.35)"
            autoFocus
          />
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.code}
            keyboardShouldPersistTaps="handled"
            style={s.list}
            ListEmptyComponent={
              <Text style={s.empty}>{t("components.phone_auth_flow.no_country_found")}</Text>
            }
            renderItem={({ item }) => {
              const isSelected = item.code === selected.code;
              return (
                <TouchableOpacity
                  style={[s.row, isSelected && s.rowSelected]}
                  onPress={() => {
                    onSelect(item);
                    onClose();
                  }}
                >
                  <Text style={s.flag}>{item.flag}</Text>
                  <Text style={[s.name, isSelected && s.nameSelected]}>{item.name}</Text>
                  <Text style={s.dial}>{item.dialCode}</Text>
                </TouchableOpacity>
              );
            }}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.60)",
    justifyContent: "flex-end",
  },
  sheet: {
    maxHeight: "70%",
    backgroundColor: "rgba(12,6,30,0.98)",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: brandAlpha.purple500_35,
    paddingBottom: 24,
  },
  handle: {
    alignSelf: "center",
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.18)",
    marginVertical: 12,
  },
  search: {
    marginHorizontal: 16,
    marginBottom: 8,
    height: 48,
    borderRadius: 14,
    paddingHorizontal: 16,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: brandAlpha.purple500_40,
    color: "#F0E8FF",
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  list: { flexGrow: 0 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.04)",
  },
  rowSelected: { backgroundColor: brandAlpha.purple500_18 },
  flag: { fontSize: 22 },
  name: {
    flex: 1,
    fontSize: 14,
    color: "#E8D8FF",
    fontFamily: "Inter_500Medium",
  },
  nameSelected: { fontFamily: "Inter_700Bold" },
  dial: {
    fontSize: 14,
    color: "rgba(180,150,255,0.70)",
    fontFamily: "Inter_600SemiBold",
  },
  empty: {
    textAlign: "center",
    color: "rgba(200,180,255,0.40)",
    padding: 24,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
});
