"use client";

import {useMemo, useState} from "react";
import {zodResolver} from "@hookform/resolvers/zod";
import {useForm} from "react-hook-form";
import {AlertDialog} from "@astryxdesign/core/AlertDialog";
import {Banner} from "@astryxdesign/core/Banner";
import {Badge} from "@astryxdesign/core/Badge";
import {Button} from "@astryxdesign/core/Button";
import {Card} from "@astryxdesign/core/Card";
import {FormLayout} from "@astryxdesign/core/FormLayout";
import {HStack} from "@astryxdesign/core/HStack";
import {List, ListItem} from "@astryxdesign/core/List";
import {Selector} from "@astryxdesign/core/Selector";
import {Stack} from "@astryxdesign/core/Stack";
import {Table, proportional} from "@astryxdesign/core/Table";
import {Heading, Text} from "@astryxdesign/core/Text";
import {useFormatter, useLocale, useTranslations} from "next-intl";
import {useRouter} from "@/i18n/navigation";
import {FormSelector} from "@/components/form-selector";
import {FormTextInput} from "@/components/form-text-input";
import {
  inviteMemberSchema,
  type InviteMemberValues,
} from "@/server/validators/team.schema";
import {isOrgRole, type OrgRole} from "@/lib/permissions";
import {
  cancelInvitationAction,
  inviteMemberAction,
  removeMemberAction,
  updateMemberRoleAction,
  type TeamErrorKey,
} from "@/app/actions/team.actions";

export type TeamMember = {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: string;
  joinedAt: string;
};

export type TeamInvitation = {
  id: string;
  email: string;
  role: string;
  expiresAt: string;
};

interface MemberRow extends Record<string, unknown> {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: string;
  joinedAt: string;
}

export function TeamManager({
  currentUserId,
  actorRole,
  assignableRoles,
  members,
  invitations,
}: {
  currentUserId: string;
  actorRole: OrgRole;
  assignableRoles: OrgRole[];
  members: TeamMember[];
  invitations: TeamInvitation[];
}) {
  const router = useRouter();
  const locale = useLocale();
  const format = useFormatter();
  const t = useTranslations("Team");
  const tRoles = useTranslations("Roles");
  const tValidation = useTranslations("Team.validation");

  const [serverError, setServerError] = useState<TeamErrorKey | null>(null);
  const [createdInvitation, setCreatedInvitation] = useState<{
    email: string;
    link: string;
    expiresAt: string;
  } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [busyMemberId, setBusyMemberId] = useState<string | null>(null);
  const [busyInvitationId, setBusyInvitationId] = useState<string | null>(
    null,
  );
  const [memberToRemove, setMemberToRemove] = useState<MemberRow | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  const schema = useMemo(
    () => inviteMemberSchema((key) => tValidation(key)),
    [tValidation],
  );

  const {
    control,
    handleSubmit,
    reset,
    formState: {isSubmitting},
  } = useForm<InviteMemberValues>({
    resolver: zodResolver(schema),
    defaultValues: {email: "", role: "staff"},
    mode: "onSubmit",
    reValidateMode: "onChange",
  });

  const roleOptions = assignableRoles.map((role) => ({
    value: role,
    label: tRoles(`${role}.label`),
  }));

  const roleLabel = (role: string) =>
    isOrgRole(role) ? tRoles(`${role}.label`) : role;

  const errorMessage = (error: TeamErrorKey) => {
    switch (error) {
      case "unauthenticated":
        return t("errors.unauthenticated");
      case "forbidden":
        return t("errors.forbidden");
      case "cannotManageOwner":
        return t("errors.cannotManageOwner");
      case "cannotChangeOwnRole":
        return t("errors.cannotChangeOwnRole");
      case "invalidRole":
        return t("errors.invalidRole");
      case "lastOwner":
        return t("errors.lastOwner");
      case "alreadyMember":
        return t("errors.alreadyMember");
      case "alreadyInvited":
        return t("errors.alreadyInvited");
      case "invalidEmail":
        return t("validation.emailInvalid");
      default:
        return t("errors.generic");
    }
  };

  const canManage = (member: MemberRow) => {
    if (member.userId === currentUserId) return false;
    if (member.role === "owner" && actorRole !== "owner") return false;
    return actorRole === "owner" || actorRole === "admin";
  };

  const invitationLink = (invitationId: string) =>
    `${window.location.origin}/${locale}/accept-invitation/${invitationId}`;

  async function onSubmit(values: InviteMemberValues) {
    setServerError(null);
    setCreatedInvitation(null);

    const result = await inviteMemberAction(values);

    if (!result.ok) {
      setServerError(result.error);
      return;
    }

    setCreatedInvitation({
      email: result.invitation.email,
      link: invitationLink(result.invitation.id),
      expiresAt: result.invitation.expiresAt,
    });
    reset({email: "", role: "staff"});
    router.refresh();
  }

  async function changeRole(member: MemberRow, role: string) {
    if (role === member.role) return;

    setServerError(null);
    setBusyMemberId(member.id);

    const result = await updateMemberRoleAction({memberId: member.id, role});

    setBusyMemberId(null);

    if (!result.ok) {
      setServerError(result.error);
      return;
    }

    router.refresh();
  }

  async function confirmRemove() {
    if (!memberToRemove) return;

    setServerError(null);
    setIsRemoving(true);

    const result = await removeMemberAction({memberId: memberToRemove.id});

    setIsRemoving(false);

    if (!result.ok) {
      setServerError(result.error);
      setMemberToRemove(null);
      return;
    }

    setMemberToRemove(null);
    router.refresh();
  }

  async function copyInvitation(invitationId: string) {
    await navigator.clipboard.writeText(invitationLink(invitationId));
    setCopiedId(invitationId);
  }

  async function cancelPendingInvitation(invitationId: string) {
    setServerError(null);
    setBusyInvitationId(invitationId);

    const result = await cancelInvitationAction({invitationId});

    setBusyInvitationId(null);

    if (!result.ok) {
      setServerError(result.error);
      return;
    }

    router.refresh();
  }

  const columns = [
    {
      key: "name",
      header: t("columns.name"),
      width: proportional(1, {minWidth: 160}),
      renderCell: (member: MemberRow) => (
        <HStack gap={2} align="center" wrap="wrap">
          <Text weight="medium">{member.name || member.email}</Text>
          {member.userId === currentUserId ? (
            <Badge label={t("you")} variant="info" />
          ) : null}
        </HStack>
      ),
    },
    {
      key: "email",
      header: t("columns.email"),
      width: proportional(1, {minWidth: 180}),
      renderCell: (member: MemberRow) => (
        <Text color="secondary">{member.email}</Text>
      ),
    },
    {
      key: "role",
      header: t("columns.role"),
      width: proportional(1, {minWidth: 190}),
      renderCell: (member: MemberRow) =>
        canManage(member) ? (
          <Selector
            label={t("columns.role")}
            isLabelHidden
            value={member.role}
            options={roleOptions}
            isDisabled={busyMemberId === member.id}
            onChange={(role) => changeRole(member, role)}
          />
        ) : (
          <Text>{roleLabel(member.role)}</Text>
        ),
    },
    {
      key: "joinedAt",
      header: t("columns.joined"),
      width: proportional(1, {minWidth: 130}),
      renderCell: (member: MemberRow) => (
        <Text color="secondary">
          {format.dateTime(new Date(member.joinedAt), {dateStyle: "medium"})}
        </Text>
      ),
    },
    {
      key: "actions",
      header: "",
      width: proportional(1, {minWidth: 90}),
      renderCell: (member: MemberRow) =>
        canManage(member) ? (
          <Button
            variant="ghost"
            size="sm"
            label={t("actions.remove")}
            onClick={() =>
              setMemberToRemove({
                ...member,
              })
            }
          />
        ) : null,
    },
  ];

  return (
    <Stack gap={6}>
      {serverError ? (
        <Banner
          status="error"
          title={t("errors.bannerTitle")}
          description={errorMessage(serverError)}
          isDismissable
          onDismiss={() => setServerError(null)}
        />
      ) : null}

      <Card padding={0}>
        <Stack gap={0}>
          <Stack gap={1} padding={5} paddingBlockEnd={2}>
            <Heading level={2}>
              {t("membersTitle")}
            </Heading>
          </Stack>
          {members.length === 0 ? (
            <Stack padding={5} paddingBlockStart={2}>
              <Text color="secondary">{t("membersEmpty")}</Text>
            </Stack>
          ) : (
            <Table
              data={members.map((member) => ({...member}))}
              columns={columns}
              idKey="id"
              density="balanced"
              dividers="rows"
            />
          )}
        </Stack>
      </Card>

      <Stack gap={4}>
        <Heading level={2}>
          {t("invite.title")}
        </Heading>
        <Text color="secondary">{t("invite.intro")}</Text>

        {createdInvitation ? (
          <Banner
            status="success"
            title={t("invite.successTitle")}
            description={t("invite.successBody", {
              email: createdInvitation.email,
              date: format.dateTime(new Date(createdInvitation.expiresAt), {
                dateStyle: "medium",
              }),
            })}
            isDismissable
            onDismiss={() => setCreatedInvitation(null)}
            endContent={
              <Button
                variant="secondary"
                size="sm"
                label={
                  copiedId === createdInvitation.link
                    ? t("invite.copied")
                    : t("invite.copy")
                }
                onClick={async () => {
                  await navigator.clipboard.writeText(createdInvitation.link);
                  setCopiedId(createdInvitation.link);
                }}
              />
            }
          />
        ) : null}

        <Card padding={5}>
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <Stack gap={4}>
              <FormLayout>
                <FormTextInput
                  control={control}
                  name="email"
                  type="email"
                  label={t("invite.email")}
                  autoComplete="email"
                  isRequired
                />
                <FormSelector
                  control={control}
                  name="role"
                  label={t("invite.role")}
                  options={roleOptions}
                  isRequired
                />
              </FormLayout>
              <Button
                variant="primary"
                type="submit"
                label={t("invite.submit")}
                isLoading={isSubmitting}
              />
            </Stack>
          </form>
        </Card>
      </Stack>

      <Stack gap={3}>
        <Heading level={2}>
          {t("invite.pendingTitle")}
        </Heading>

        {invitations.length === 0 ? (
          <Text color="secondary">{t("invite.pendingEmpty")}</Text>
        ) : (
          <Card padding={0}>
            <List density="balanced" hasDividers>
              {invitations.map((invitation) => (
                <ListItem
                  key={invitation.id}
                  label={invitation.email}
                  description={`${roleLabel(invitation.role)} · ${t(
                    "invite.expires",
                    {
                      date: format.dateTime(
                        new Date(invitation.expiresAt),
                        {dateStyle: "medium"},
                      ),
                    },
                  )}`}
                  endContent={
                    <HStack gap={2} align="center" wrap="wrap">
                      <Button
                        variant="secondary"
                        size="sm"
                        label={
                          copiedId === invitation.id
                            ? t("invite.copied")
                            : t("invite.copy")
                        }
                        onClick={() => copyInvitation(invitation.id)}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        label={t("invite.cancel")}
                        isLoading={busyInvitationId === invitation.id}
                        onClick={() =>
                          cancelPendingInvitation(invitation.id)
                        }
                      />
                    </HStack>
                  }
                />
              ))}
            </List>
          </Card>
        )}
      </Stack>

      <AlertDialog
        isOpen={memberToRemove !== null}
        onOpenChange={(isOpen) => {
          if (!isOpen) setMemberToRemove(null);
        }}
        title={t("actions.removeTitle", {
          name: memberToRemove?.name ?? memberToRemove?.email ?? "",
        })}
        description={t("actions.removeBody")}
        actionLabel={t("actions.removeConfirm")}
        cancelLabel={t("actions.cancel")}
        isActionLoading={isRemoving}
        onAction={confirmRemove}
      />
    </Stack>
  );
}
