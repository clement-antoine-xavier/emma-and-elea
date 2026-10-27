"use client";

import type {Control, FieldPath, FieldValues} from "react-hook-form";
import {Controller} from "react-hook-form";
import {
  DateTimeInput,
  type ISODateTimeString,
} from "@astryxdesign/core/DateTimeInput";

type FormDateTimeInputProps<T extends FieldValues> = {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  description?: string;
  isRequired?: boolean;
};

export function FormDateTimeInput<T extends FieldValues>({
  control,
  name,
  label,
  description,
  isRequired,
}: FormDateTimeInputProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({field, fieldState}) => (
        <DateTimeInput
          label={label}
          description={description}
          aria-label={label}
          value={
            typeof field.value === "string" && field.value
              ? (field.value as unknown as ISODateTimeString)
              : undefined
          }
          onChange={(value) => field.onChange(value ?? "")}
          hourFormat="24h"
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
