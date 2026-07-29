ACTS Portal

EVENTS

Versão: 1.0Status: Oficial

Objetivo

Este documento define os eventos oficiais do Event Bus do Portal ACTS.

Eventos permitem comunicação desacoplada entre módulos.

O módulo que publica um evento não conhece quem irá consumi-lo.

Regras

Eventos representam fatos que já aconteceram.

Utilizar nomes em PascalCase.

Não utilizar eventos para chamadas síncronas.

Eventos devem ser idempotentes quando necessário.

Alterações incompatíveis devem ser documentadas.

Convenção

Os nomes devem seguir o padrão:

UserCreated

ListingPublished

PaymentReceived

SubscriptionActivated

Eventos por Módulo

Users

UserCreated

UserUpdated

UserDeleted

Auth

UserLoggedIn

UserLoggedOut

PasswordResetRequested

PasswordResetCompleted

Listings

ListingCreated

ListingUpdated

ListingDeleted

ListingPublished

ListingArchived

Payments

PaymentCreated

PaymentReceived

PaymentFailed

PaymentRefunded

Plans

PlanCreated

PlanUpdated

Subscriptions

SubscriptionActivated

SubscriptionRenewed

SubscriptionCancelled

SubscriptionExpired

Upload

UploadStarted

UploadCompleted

UploadFailed

Media

MediaCreated

MediaDeleted

Notifications

NotificationQueued

NotificationSent

NotificationFailed

Publish

PublishStarted

PublishCompleted

PublishFailed

Search

SearchIndexed

SearchReindexed

Reviews

ReviewCreated

ReviewApproved

ReviewRejected

Contacts

ContactReceived

Leads

LeadCreated

LeadQualified

Analytics

AnalyticsUpdated

Dashboard

DashboardUpdated

Reports

ReportGenerated

SEO

SitemapGenerated

RobotsUpdated

Fluxo

Evento↓Event Bus↓Consumidores interessados↓Ações independentes

Boas práticas

Publicar apenas eventos relevantes.

Evitar duplicidade.

Não embutir regras de negócio no Event Bus.

Consumidores devem tratar falhas localmente.

Estado

Esta lista representa os eventos oficiais iniciais.

Novos eventos deverão ser documentados antes da implementação.
