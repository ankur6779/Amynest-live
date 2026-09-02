import { describe, expect, it } from "vitest";
import { roomsNutritionPreview } from "./rooms-nutrition-preview";

describe("roomsNutritionPreview", () => {
  it("maps the Rooms profile ages to nutrition bands with usable copy", () => {
    const infant = roomsNutritionPreview(8);
    expect(infant.ageGroupId).toBe("infant_6_12");
    expect(infant.hasMeal).toBe(true);
    expect(infant.lunch).toMatch(/milk|dal|khichdi|porridge|puree|mash/i);

    const preschool = roomsNutritionPreview(36);
    expect(preschool.ageGroupId).toBe("preschool_3_6");
    expect(preschool.hasMeal).toBe(true);

    const school = roomsNutritionPreview(72);
    expect(school.ageGroupId).toBe("school_6_10");
    expect(school.hasMeal).toBe(true);
  });

  it("keeps exclusive-breastfeeding guidance when no complementary meal plan exists", () => {
    const newborn = roomsNutritionPreview(3);
    expect(newborn.ageGroupId).toBe("infant_0_6");
    expect(newborn.hasMeal).toBe(false);
    expect(newborn.description.toLowerCase()).toMatch(/breast/);
  });

  it("flips bands at the published month boundaries", () => {
    expect(roomsNutritionPreview(11).ageGroupId).toBe("infant_6_12");
    expect(roomsNutritionPreview(12).ageGroupId).toBe("toddler_1_3");
    expect(roomsNutritionPreview(35).ageGroupId).toBe("toddler_1_3");
    expect(roomsNutritionPreview(36).ageGroupId).toBe("preschool_3_6");
    expect(roomsNutritionPreview(71).ageGroupId).toBe("preschool_3_6");
    expect(roomsNutritionPreview(72).ageGroupId).toBe("school_6_10");
  });
});
