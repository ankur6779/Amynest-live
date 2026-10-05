CLAIMS

I claim:

1. A computer-implemented system for supplying an authoritative environmental classification to a routine-generation process, comprising:

    (a) an explicit user-preference preservation state comprising a synchronously readable data structure and a deferred component-state data structure within an asynchronous state-management layer, wherein explicit user engagement with an environmental selection control immediately designates a user-selected environmental value as authoritative in the synchronously readable data structure;

    (b) a registry of pending asynchronous operations configured to hold at most one active environmental detection operation, such that, where a user-selected environmental value is not already authoritative, concurrent invocations of a routine-generation trigger share said operation and are prevented from initiating competing environmental detection operations;

    (c) a geolocation interface module configured to obtain device coordinates through a platform-provided geolocation provider with a configurable timeout;

    (d) an environmental data interface module configured to query a remote meteorological data service using said coordinates and to receive at least one of: a standard weather-condition code, an ambient temperature value, a precipitation value, and a wind-speed value;

    (e) an ambient-condition classification module configured to derive an outdoor-suitability classification from environmental parameters received from an environmental detection operation by mapping said parameters to one of a fixed set of outdoor-suitability classifications;

    (f) an explicit-preference preservation module configured, after an environmental detection operation resolves, to re-evaluate the synchronously readable data structure and, where a user-selected environmental value has become authoritative during the asynchronous resolution window, to discard the derived classification so that said derived classification does not supersede the user-selected environmental value; and

    (g) a payload injection module configured to designate as the authoritative environmental classification the user-selected environmental value where that value is authoritative, and otherwise the derived classification, and to inject the designated authoritative environmental classification as a parameter into a routine-generation call chain independently of whether the deferred component-state data structure has been committed in a user-interface synchronisation cycle.

2. The system of claim 1, wherein the geolocation interface module operates non-blockingly, catching exceptions including permission denial, network error, timeout, and abort signal, and returning a null classification on failure such that routine generation proceeds with an existing user-selected or default value.

3. The system of claim 1, wherein the routine-generation call chain comprises an asynchronous confirmation dialogue, and wherein a derived classification is captured in a pending-action closure prior to dialogue presentation and re-injected into the routine-generation payload upon dialogue confirmation.

4. The system of claim 1, wherein the fixed set of outdoor-suitability classifications comprises a suitable classification, a limited classification, and an unsuitable classification mapped according to weather-condition code, precipitation, wind speed, and temperature thresholds.

5. The system of claim 1, further comprising a helper configured to update the synchronously readable data structure and the deferred component-state data structure atomically from a calling context.

6. The system of claim 1, implemented across at least a web-browser frontend execution environment and a native mobile frontend execution environment, the ambient-condition classification module being functionally identical across said environments.

7. A computer-implemented method for supplying an authoritative environmental classification to a routine-generation process, comprising:

    (a) receiving a routine-generation trigger;

    (b) evaluating an explicit user-preference preservation state comprising a synchronously readable data structure and a deferred component-state data structure;

    (c) where the synchronously readable data structure indicates that a user-selected environmental value is already authoritative, designating that user-selected environmental value as the authoritative environmental classification and proceeding to step (h);

    (d) where a user-selected environmental value is not already authoritative, querying a registry of pending asynchronous operations and either awaiting an existing pending environmental detection operation or initiating a new environmental detection operation, registering said new operation, and awaiting its resolution, concurrent triggers being prevented from initiating competing environmental detection operations;

    (e) upon resolution, deriving an outdoor-suitability classification from received environmental parameters when a detection result is available;

    (f) re-evaluating the synchronously readable data structure and, where a user-selected environmental value has become authoritative during the asynchronous resolution window, discarding the derived classification so that said derived classification does not supersede the user-selected environmental value;

    (g) designating as the authoritative environmental classification the user-selected environmental value where that value is authoritative, and otherwise the derived classification; and

    (h) injecting the designated authoritative environmental classification as a parameter into a routine-generation payload independently of whether the deferred component-state data structure has been committed in a user-interface synchronisation cycle.

8. The method of claim 7, wherein two or more concurrent invocations share a single environmental detection operation, thereby reducing redundant computational requests.

9. The method of claim 7, wherein step (h) injects the designated authoritative environmental classification into the generation payload without waiting for the deferred component-state data structure to commit.

10. A computer-implemented system for adaptive generation of a child development routine, comprising:

    (a) an age-band classification engine configured to assign a child to one of a plurality of developmental age bands, each band associated with a distinct set of activity vocabulary constraints, meal guidance, sleep parameters, and structural templates;

    (b) a date-seeded shuffle function configured to randomise activity-pool ordering using a seed derived from at least a generation date and a child identifier;

    (c) a hybrid generation engine comprising a deterministic rule-based path operating on template activity pools and a generative artificial-intelligence module constrained by age-band guidance, the engine being configured to produce a routine artefact from the deterministic rule-based path without invoking the generative artificial-intelligence module, or from the generative artificial-intelligence module; and

    (d) deterministic constraint/correction processing configured to operate on an output of the generative artificial-intelligence module, providing at least temporal anchoring of activity start times to a wake-time reference and schedule-consistency enforcement excluding activity placement during mandatory school hours.

11. The system of claim 10, wherein the deterministic constraint/correction processing further provides allergy filtering, cuisine authenticity validation against a regional canonical-name registry, and cross-slot deduplication of dish names.

12. The system of claim 10, further comprising an energy-profile re-ordering module configured, when a predetermined minimum sample count of observations is available, to read a historically observed energy profile comprising at least a peak-focus window and a low-energy window and to reassign activity time slots accordingly.

13. The system of claim 10, further comprising a caregiver-adaptive transformation module configured to receive a caregiver identity parameter selected from a plurality of caregiver profiles and to rewrite routine-item instruction notes according to a rewriting policy associated with the selected profile.

14. The system of claim 10, further comprising an environmental-state-driven activity substitution module configured to substitute outdoor activities with deterministic indoor equivalents responsive to an unsuitable classification, to reduce activity duration and append an indoor backup note responsive to a limited classification, and to pass items unchanged responsive to a suitable classification.

15. The system of claim 10, further comprising an anti-repetition module configured to incorporate prior-day category frequencies into a prompt supplied to the generative artificial-intelligence module and to cross-check prior-day categories in post-processing.

16. The system of claim 10, wherein the deterministic rule-based path inserts mandatory meal anchor blocks and selects meal names from age-band-specific template pools.

17. The method of claim 7, comprising maintaining cooperatively the synchronously readable data structure and the deferred component-state data structure such that the synchronously readable data structure is authoritative within an asynchronous closure for explicit user-preference preservation while the deferred component-state data structure drives user-interface re-rendering.

18. A computer-implemented method for deterministic correction of probabilistic outputs of a language-model inference engine in child development routine generation, comprising:

    (a) receiving a probabilistic routine output from the language-model inference engine;

    (b) applying temporal anchoring to align activity start times with a wake-time reference;

    (c) applying schedule-consistency enforcement to exclude activity placement during mandatory school hours;

    (d) applying allergy filtering to remove items conflicting with stored allergy parameters and to substitute deterministic safe alternatives;

    (e) applying cuisine authenticity validation against a regional canonical-name registry;

    (f) applying cross-slot deduplication to remove repeated dish names within the same routine; and

    (g) returning a corrected routine artefact for delivery to a client execution environment.

19. The method of claim 18, further comprising applying environmental-state-driven activity substitution responsive to a categorical outdoor-suitability classification.

20. A computer-implemented method for generating personalised meal options within a child development routine, comprising:

    (a) anchoring meal-slot times and labels within a generated routine based on a child’s age band and wake-up and sleep times;

    (b) receiving a parent-supplied ingredient inventory and at least one of a regional cuisine parameter, a dietary restriction parameter, and an allergy list;

    (c) sanitising the parent-supplied ingredient inventory such that instruction-like wording therein is treated as ingredient names;

    (d) constructing a constrained natural-language prompt for a language-model inference engine instructing the engine to generate a predetermined number of distinct dish-name options per meal slot, using the supplied ingredients as primary components and constrained to the regional cuisine, dietary restriction, and allergy parameters; and

    (e) applying a cross-slot deduplication function ensuring no dish name appears in more than one meal slot within the same daily routine.

21. The method of claim 20, wherein the regional cuisine parameter is selected from a set comprising at least North Indian, South Indian, Bengali, Western, Asian, and Pan-Indian, and wherein the prompt incorporates a region-specific description of canonical dishes, ingredients, and cooking techniques.

22. The method of claim 20, wherein the dietary restriction parameter for a Jain dietary profile constrains the prompt to exclude meat, fish, and eggs, to exclude root vegetables, and to exclude onion and garlic from suggested options.
