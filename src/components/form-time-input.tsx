"use client";

import type {Control, FieldPath, FieldValues} from "react-hook-form";
import {Controller} from "react-hook-form";
import {TimeInput} from "@astryxdesign/core/TimeInput";
import type {ISOTimeString} from "@astryxdesign/core/utils";

type FormTimeInputProps<T extends FieldValues> = {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  description?: string;
  isRequired?: boolean;
};

export function FormTimeInput<T extends FieldValues>({
  control,
  name,
  label,
  description,
  isRequired,
}: FormTimeInputProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({field, fieldState}) => (
        <TimeInput
          label={label}
          description={description}
          value={
            typeof field.value === "string" && field.value
              ? (field.value as unknown as ISOTimeString)
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
