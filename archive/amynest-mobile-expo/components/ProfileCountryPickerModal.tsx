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
import {
  PROFILE_COUNTRIES,
  filterProfileCountries,
  type ProfileCountry,
} from "@workspace/phone-auth";
import { brand, brandAlpha } from "@/constants/colors";

type Props = {
  visible: boolean;
  selectedCode: string;
  onSelect: (country: ProfileCountry) => void;
  onClose: () => void;
};

export default function ProfileCountryPickerModal({
  visible,
  selectedCode,
  onSelect,
  onClose,
}: Props) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!visible) setQuery("");
  }, [visible]);

  const filtered = useMemo(
    () => filterProfileCountries(PROFILE_COUNTRIES, query),
    [query],
  );

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose}>
        <Pressable style={s.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={s.handle} />
          <Text style={s.title}>{t("screens.tabs_profile.select_country")}</Text>
          <TextInput
            style={s.search}
            value={query}
            onChangeText={setQuery}
            placeholder={t("screens.tabs_profile.country_search_placeholder")}
            placeholderTextColor="rgba(200,180,255,0.35)"
            autoFocus
          />
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.code}
            keyboardShouldPersistTaps="handled"
            style={s.list}
            ListEmptyComponent={
              <Text style={s.empty}>{t("screens.tabs_profile.no_country_found")}</Text>
            }
            renderItem={({ item }) => {
              const isSelected = item.code === selectedCode;
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
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#1A1030",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
    paddingBottom: 24,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 8,
  },
  title: {
    color: "#F0E8FF",
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
    marginBottom: 8,
  },
  search: {
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: brandAlpha.purple12,
    borderWidth: 1,
    borderColor: brandAlpha.purple25,
    color: "#F0E8FF",
    fontSize: 15,
  },
  list: { paddingHorizontal: 8 },
  empty: {
    color: "rgba(200,180,255,0.5)",
    textAlign: "center",
    padding: 24,
    fontSize: 14,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 12,
  },
  rowSelected: { backgroundColor: brandAlpha.purple20 },
  flag: { fontSize: 22 },
  name: { flex: 1, fontSize: 16, color: "#E8DEFF", fontFamily: "Inter_400Regular" },
  nameSelected: { color: brand.purple300, fontFamily: "Inter_600SemiBold" },
});
