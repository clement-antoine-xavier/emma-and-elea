"use client";

import type {Control, FieldPath, FieldValues} from "react-hook-form";
import {Controller} from "react-hook-form";
import {DateInput} from "@astryxdesign/core/DateInput";

type FormDateInputProps<T extends FieldValues> = {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  description?: string;
  isRequired?: boolean;
};

/**
 * Astryx `DateInput` works with ISO calendar days (`YYYY-MM-DD`), which is the
 * same shape the `@db.Date` columns use. Empty stays an empty string in the
 * form; the action decides whether that is allowed.
 */
export function FormDateInput<T extends FieldValues>({
  control,
  name,
  label,
  description,
  isRequired,
}: FormDateInputProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({field, fieldState}) => (
        <DateInput
          label={label}
          description={description}
          value={typeof field.value === "string" ? field.value : undefined}
          onChange={(value) => field.onChange(value ?? "")}
          isRequired={isRequired}
          status={
            fieldState.error
              ? {type: "error", message: fieldState.error.message}
              : undefined
          }
        />
      )}
    />
  );
}
