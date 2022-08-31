/*
 * Copyright (C) 2009-2022 SAP SE or an SAP affiliate company. All rights reserved.
 */
(function() {
    "use strict";
    var C = {
        BasePath: "./integrationScript.php",
        ResultHeadersPath: "",
        CORS: false,
        CSRFTokenHeader: "X-CSRF-Token",
        AppendScenarioParameter: "",
        Tenant: "",
        Version: "23.0.3"
    };
    var R = {
        getConfig: function(c) {
            if (c) {
                var b = R.Setting.get(c, "lpi-base-path"),
                    t = R.Setting.get(c, "lpi-tenant");
                if (b && t) {
                    return {
                        BasePath: b,
                        ResultHeadersPath: "",
                        CORS: true,
                        CSRFTokenHeader: "",
                        AppendScenarioParameter: "_L54AD1F204_",
                        Tenant: t,
                        Version: C.Version
                    };
                }
            }
            return C;
        },
        initialize: function() {
            if (this.isInitializing() || this.isInitialized()) {
                return;
            }
            this.reset();
            var c = this.getPages(),
                i;
            for (i = 0; i < c.length; i++) {
                this.ContentPage.prepare(c[i]);
            }
            this.Request.fetchToken(c, this.handleFetchTokenResponse.bind(this));
        },
        handleFetchTokenResponse: function(c, s) {
            var i;
            if (s) {
                for (i = 0; i < c.length; i++) {
                    this.Result.sendOpen(c[i], this.handleOpenResponse.bind(this));
                }
            } else {
                for (i = 0; i < c.length; i++) {
                    R.ContentPage.toggleErrorMessage(c[i], true);
                }
            }
        },
        handleOpenResponse: function(c, r) {
            if (R.Request.isErrorResponse(r)) {
                R.ContentPage.toggleErrorMessage(c, true);
            } else {
                this.ContentPage.finishLoading(c, r);
            }
            c.sapCpInitializing = false;
            c.sapCpInitialized = true;
        },
        isInitializing: function() {
            var c = this.getPages(),
                i;
            for (i = 0; i < c.length; i++) {
                if (c[i].sapCpInitializing) {
                    return true;
                }
            }
            return false;
        },
        isInitialized: function() {
            var c = this.getPages(),
                i;
            for (i = 0; i < c.length; i++) {
                if (!c[i].sapCpInitialized) {
                    return false;
                }
            }
            return true;
        },
        getPages: function() {
            return R.Node.getAllWithClassName(document, "sapCpContentPage");
        },
        reset: function() {
            var c = this.getPages(),
                i, o;
            for (i = 0; i < c.length; i++) {
                o = c[i];
                delete o.sapCpInitializing;
                delete o.sapCpInitialized;
                delete o.sapCpCSRFToken;
            }
        },
        ContentPage: {
            prepare: function(c) {
                if (c.sapCpInitializing || c.sapCpInitialized) {
                    return;
                }
                c.sapCpInitializing = true;
                this.checkVersion(c);
                this.prepareWidgets(c);
                this.appendOutboundIdToLinks(c);
                R.Event.registerListener(c, "submit", this.handleSubmitEvent.bind(this));
            },
            checkVersion: function(c) {
                var s = R.Setting.get(c, "version"),
                    m = R.getConfig(c);
                if (s > m.Version) {
                    R.Console.warn("You are using an outdated version of the landing page script");
                }
            },
            prepareWidgets: function(c) {
                var w = this.getWidgets(c),
                    i;
                for (i = 0; i < w.length; i++) {
                    R.Widget.prepare(w[i]);
                }
            },
            getWidgets: function(c) {
                return R.Node.getAllWithClassName(c, "sapCpWidget");
            },
            findSurroundingLandingPageOrReturnForm: function(c) {
                return (R.Util.findParentByClassName(c, "sapLandingPage") || c);
            },
            appendOutboundIdToLinks: function(c) {
                var o = R.Util.getOutboundId();
                if (!o) {
                    return;
                }
                var r = R.ContentPage.findSurroundingLandingPageOrReturnForm(c),
                    l = r.getElementsByTagName("a"),
                    i;
                for (i = 0; i < l.length; i++) {
                    l[i].href = R.Util.appendOutboundId(l[i].href, o);
                }
            },
            checkMissingMandatoryFieldsLabel: function(n) {
                var c = R.Util.findParentByClassName(n, "sapCpContentPage"),
                    m = R.Node.getAllWithClassName(c, "sapCpWidgetMandatoryMissing"),
                    h = (m.length > 0);
                R.ContentPage.toggleMissingMandatoryField(c, h);
            },
            finishLoading: function(c, r) {
                if (r && r.ContactPersonalizationData && r.ContactPersonalizationData.results) {
                    this.processPersonalizationData(c, r.ContactPersonalizationData.results);
                }
                this.processDataAndPrepareProgresProfileWidget(c);
                this.toggleLoading(c, false);
            },
            processPersonalizationData: function(c, p) {
                var P, w = this.getWidgets(c),
                    W, i;
                for (i = 0; i < p.length; i++) {
                    P = p[i];
                    W = R.Util.findWidgetByKey(w, P.WidgetKeyHash);
                    if (W) {
                        R.Widget.applyPersonalization(W, P.Value);
                    }
                }
            },
            processDataAndPrepareProgresProfileWidget: function(c) {
                var w = this.getWidgets(c),
                    i, W, m = R.Setting.get(c, "progres-max"),
                    M = parseInt(m, 10);
                if (R.Setting.get(c, "prefill-data") !== "true") {
                    return;
                }
                if (R.Setting.get(c, "progres-enabled") !== "true") {
                    return;
                }
                var p = [];
                for (i = 0; i < w.length; i++) {
                    W = R.Widget.addProgressiveEnabledWidgets(w[i]);
                    if (W !== null && W !== undefined) {
                        p.push(W);
                    }
                }
                p.sort(function(a, b) {
                    return a.widgetPrio - b.widgetPrio;
                });
                for (var I = 0; I < M && I < p.length; I++) {
                    if (R.CSS.hasClass(p[I].widget, "sapCpWidgetMandatory")) {
                        if (R.Node.getFirstWithClassName(p[I].widget, "sapCpInput")) {
                            R.Node.getFirstWithClassName(p[I].widget, "sapCpInput").setAttribute("required", "required");
                        }
                        if (R.Node.getFirstWithClassName(p[I].widget, "sapCpDropDown")) {
                            Array.from(R.Node.getAllWithClassName(p[I].widget, "sapCpDropDown")).forEach(function(s) {
                                s.setAttribute("required", "required");
                            });
                        }
                        if (R.Node.getFirstWithClassName(p[I].widget, "sapCpCheckBox")) {
                            R.Node.getFirstWithClassName(p[I].widget, "sapCpCheckBox").setAttribute("required", "required");
                        }
                    }
                    R.CSS.toggleClass(p[I].widget, "sapCpWidgetHidden", false);
                }
            },
            handleSubmitEvent: function(e) {
                if (e.preventDefault) {
                    e.preventDefault();
                }
            },
            collectAnswers: function(c, o, f) {
                var w = this.getWidgets(c),
                    W, a = [],
                    i = 0,
                    m = false,
                    I = false,
                    b;
                for (b = 0; b < w.length; b++) {
                    W = w[b];
                    R.Widget.collectAnswer(W, o, function(A) {
                        if (A) {
                            a.push(A);
                        } else if (A === false && !R.CSS.hasClass(W, "sapCpWidgetHidden")) {
                            m = true;
                        } else if (A === null) {
                            I = true;
                        }
                        i++;
                        if (i === w.length) {
                            if (m || I) {
                                f(false);
                            } else {
                                f(a);
                            }
                        }
                    });
                }
            },
            toggleLoading: function(c, s) {
                R.CSS.toggleClass(c, "sapCpContentPageLoading", s);
            },
            toggleMissingMandatoryField: function(c, s) {
                R.CSS.toggleClass(c, "sapCpMissingMandatoryField", s);
            },
            toggleInvalid: function(c, i) {
                R.CSS.toggleClass(c, "sapCpContentPageInvalid", i);
            },
            toggleErrorMessage: function(c, s) {
                R.CSS.toggleClass(c, "sapCpSubmitError", s);
            },
            toggleSuccessMessage: function(c, s) {
                R.CSS.toggleClass(c, "sapCpSubmitCompleted", s);
            },
            isProductiveTestMode: function(c) {
                var t = R.Setting.get(c, "test-mode"),
                    p = R.Setting.get(c, "productive");
                return (t && p);
            },
            setErrorMessage: function(c, e) {
                var E = R.Node.getFirstWithClassName(c, "sapCpErrorMessageText");
                if (E) {
                    E.sapCpErrorMessage = (E.sapCpErrorMessage || E.textContent);
                    E.textContent = (e || E.sapCpErrorMessage);
                }
            }
        },
        Layout: {},
        Widget: {
            prepare: function(w) {
                if (this.isInputWidget(w)) {
                    R.InputWidget.prepare(w);
                } else if (this.isCheckBoxWidget(w)) {
                    R.CheckBoxWidget.prepare(w);
                } else if (this.isDownloadWidget(w)) {
                    R.DownloadWidget.prepare(w);
                } else if (this.isButtonWidget(w)) {
                    R.ButtonWidget.prepare(w);
                } else if (this.isInteractionWidget(w)) {
                    R.InteractionWidget.prepare(w);
                }
            },
            applyPersonalization: function(w, v) {
                if (this.isInputWidget(w)) {
                    R.InputWidget.applyPersonalization(w, v);
                } else if (this.isCheckBoxWidget(w)) {
                    R.CheckBoxWidget.applyPersonalization(w, v);
                }
            },
            collectAnswer: function(w, c, f) {
                var h = function(a) {
                    if (a === false) {
                        R.Widget.toggleMissingMandatory(w, true);
                        R.Widget.toggleInvalid(w, false);
                    } else if (a === null) {
                        R.Widget.toggleMissingMandatory(w, false);
                        R.Widget.toggleInvalid(w, true);
                    } else {
                        R.Widget.toggleMissingMandatory(w, false);
                        R.Widget.toggleInvalid(w, false);
                    }
                    f(a);
                };
                if (this.isTextWidget(w)) {
                    f();
                } else if (this.isInputWidget(w)) {
                    R.InputWidget.collectAnswer(w, h);
                } else if (this.isNoteWidget(w)) {
                    R.NoteWidget.collectAnswer(w, h);
                } else if (this.isCheckBoxWidget(w)) {
                    R.CheckBoxWidget.collectAnswer(w, h);
                } else if (this.isDownloadWidget(w)) {
                    R.DownloadWidget.collectAnswer(w, h);
                } else if (this.isButtonWidget(w)) {
                    R.ButtonWidget.collectAnswer(w, c, h);
                } else if (this.isInteractionWidget(w)) {
                    R.InteractionWidget.collectAnswer(w, h);
                } else if (this.isCaptchaWidget(w)) {
                    R.CaptchaWidget.collectAnswer(w, h);
                }
            },
            addProgressiveEnabledWidgets: function(w) {
                var W = w;
                if (!this.isInputWidget(w)) {
                    return null;
                }
                if (R.Setting.get(W, "wProgres-enabled") === "false") {
                    return null;
                }
                var i = R.Node.getFirstWithClassName(W, "sapCpInput");
                if (R.Node.getFirstWithClassName(W, "sapCpDropDown")) {
                    i = R.Node.getFirstWithClassName(W, "sapCpDropDown");
                }
                if (R.Node.getFirstWithClassName(W, "sapCpCheckBox")) {
                    i = R.Node.getFirstWithClassName(W, "sapCpCheckBox");
                }
                if (i && !i.value) {
                    return {
                        widgetPrio: R.Setting.get(W, "wProgres-prio"),
                        widget: W
                    };
                }
                return null;
            },
            isMandatory: function(w) {
                return R.CSS.hasClass(w, "sapCpWidgetMandatory");
            },
            isTextWidget: function(w) {
                return R.CSS.hasClass(w, "sapCpTextWidget");
            },
            isInputWidget: function(w) {
                return R.CSS.hasClass(w, "sapCpInputWidget");
            },
            isNoteWidget: function(w) {
                return R.CSS.hasClass(w, "sapCpNoteWidget");
            },
            isCheckBoxWidget: function(w) {
                return R.CSS.hasClass(w, "sapCpCheckBoxWidget");
            },
            isDownloadWidget: function(w) {
                return R.CSS.hasClass(w, "sapCpDownloadWidget");
            },
            isButtonWidget: function(w) {
                return R.CSS.hasClass(w, "sapCpButtonWidget");
            },
            isInteractionWidget: function(w) {
                return R.CSS.hasClass(w, "sapCpInteractionWidget");
            },
            isCaptchaWidget: function(w) {
                return R.CSS.hasClass(w, "sapCpCaptchaWidget");
            },
            toggleMissingMandatory: function(w, m) {
                R.CSS.toggleClass(w, "sapCpWidgetMandatoryMissing", m);
            },
            toggleInvalid: function(w, i) {
                R.CSS.toggleClass(w, "sapCpWidgetInvalid", i);
            }
        },
        InputWidget: {
            prepare: function(i) {
                var I = R.Widget.isMandatory(i),
                    a, d, D, b;
                d = i.getElementsByTagName("select");
                for (b = 0; b < d.length; b++) {
                    R.Event.registerListener(d[b], "change", this.handleDropDownChangeEvent.bind(this));
                }
                D = R.Node.getFirstWithClassName(i, "sapCpDatePicker");
                if (D) {
                    this.prepareDatePicker(D);
                }
                if (R.CSS.hasClass(i, "sapCpContactAttribute-COUNTRY")) {
                    this.prepareCountryNode(i);
                }
                if (R.CSS.hasClass(i, "sapCpContactAttribute-REGION")) {
                    this.prepareRegionNode(i);
                }
                if (R.Setting.get(i, "wProgres-enabled") === "true") {
                    R.CSS.toggleClass(i, "sapCpWidgetHidden", true);
                    if (R.CSS.hasClass(i, "sapCpWidgetMandatory")) {
                        if (R.Node.getFirstWithClassName(i, "sapCpInput")) {
                            R.Node.getFirstWithClassName(i, "sapCpInput").removeAttribute("required");
                        }
                        if (R.Node.getFirstWithClassName(i, "sapCpDropDown")) {
                            var s = R.Node.getAllWithClassName(i, "sapCpDropDown");
                            Array.from(s).forEach(this.appendChildNodes);
                        }
                        if (R.Node.getFirstWithClassName(i, "sapCpCheckBox")) {
                            R.Node.getFirstWithClassName(i, "sapCpCheckBox").removeAttribute("required");
                        }
                    }
                }
                if (!I) {
                    return;
                }
                a = i.getElementsByTagName("input");
                if (a[0]) {
                    R.Event.registerListener(a[0], "focusout", this.handleInputFocusOutEvent.bind(this));
                }
            },
            prepareDatePicker: function(d) {
                var D = R.Node.getAllWithClassName(d, "sapCpDropDown"),
                    o, i;
                for (i = 0; i < D.length; i++) {
                    o = D[i];
                    if (R.CSS.hasClass(o, "sapCpDatePickerDay")) {
                        this.prepareDatePickerDayDropDown(o);
                    } else if (R.CSS.hasClass(o, "sapCpDatePickerMonth")) {
                        R.Event.registerListener(o, "change", this.handleDatePickerDropDownChangeEvent.bind(this));
                    } else if (R.CSS.hasClass(o, "sapCpDatePickerYear")) {
                        this.prepareDatePickerYearDropDown(o);
                        R.Event.registerListener(o, "change", this.handleDatePickerDropDownChangeEvent.bind(this));
                    }
                }
            },
            prepareDatePickerDayDropDown: function(d) {
                var i;
                for (i = 1; i <= 31; i++) {
                    this.addDatePickerDropDownOption(d, i);
                }
            },
            prepareDatePickerYearDropDown: function(y) {
                var d = R.Setting.get(y, "dropdowntype"),
                    Y = d.split("-"),
                    i, a, c = new Date(),
                    b = c.getFullYear(),
                    e, I;
                if (Y.length === 4) {
                    i = (parseInt(Y[2], 10) || 0);
                    a = (parseInt(Y[3], 10) || 0);
                }
                if (i > 0) {
                    for (I = i; I > 0; I--) {
                        e = b + I;
                        this.addDatePickerDropDownOption(y, e);
                    }
                }
                this.addDatePickerDropDownOption(y, b);
                if (a > 0) {
                    for (I = 1; I <= a; I++) {
                        e = b - I;
                        this.addDatePickerDropDownOption(y, e);
                    }
                }
            },
            prepareCountryNode: function(c) {
                R.Event.registerListener(c, "change", this.handleCountryDropDownChangeEvent.bind(this));
            },
            prepareRegionNode: function(r) {
                var s = r.getElementsByTagName("select"),
                    i, S;
                for (i = 0; i < s.length; i++) {
                    S = this.findSelectedCountryCode(r);
                    if (S) {
                        this.updateRegionValues(s[i], S);
                        s[i].disabled = false;
                    } else {
                        s[i].disabled = true;
                    }
                }
            },
            findSelectedCountryCode: function(n) {
                var i, c = R.Util.findSiblingNodeByClassName(n, "sapCpContactAttribute-COUNTRY"),
                    s = c.getElementsByTagName("select")[0],
                    S = s.options;
                for (i = 0; i < S.length; i++) {
                    if (S[i].selected && S[i].value) {
                        return S[i].value;
                    }
                }
                return null;
            },
            applyPersonalization: function(i, v) {
                var I = R.Node.getFirstWithClassName(i, "sapCpInput"),
                    c = R.Node.getFirstWithClassName(i, "sapCpCheckBox"),
                    d = R.Node.getFirstWithClassName(i, "sapCpDatePicker"),
                    D = R.Node.getFirstWithClassName(i, "sapCpDropDown"),
                    a;
                if (!v) {
                    return;
                }
                if (I) {
                    I.value = v;
                } else if (c) {
                    a = c.getElementsByTagName("input");
                    if (a[0]) {
                        a[0].checked = !!v;
                    }
                } else if (d) {
                    if (v !== "00000000") {
                        var y = R.Node.getFirstWithClassName(d, "sapCpDatePickerYear"),
                            m = R.Node.getFirstWithClassName(d, "sapCpDatePickerMonth"),
                            o = R.Node.getFirstWithClassName(d, "sapCpDatePickerDay");
                        if (y) {
                            y.value = v.substring(0, 4);
                        }
                        if (m) {
                            m.value = v.substring(4, 6);
                        }
                        if (o) {
                            o.value = v.substring(6, 8);
                        }
                    }
                } else if (D) {
                    var b = D.parentElement.parentElement.classList.contains("sapCpContactAttribute-COUNTRY");
                    if (b) {
                        var r = R.Util.findSiblingNodeByClassName(D, "sapCpContactAttribute-REGION");
                    }
                    if (b && r) {
                        D.value = v;
                        this.updateDropDownValue(D);
                        this.prepareRegionNode(r);
                    } else {
                        D.value = v;
                        this.updateDropDownValue(D);
                    }
                }
            },
            appendChildNodes: function(s) {
                var S = R.Node.createEmptyOptionElement();
                if (s.querySelectorAll("option[selected = 'selected']").length === 0) {
                    s.appendChild(S);
                }
                s.removeAttribute("required");
            },
            handleInputFocusOutEvent: function(e) {
                var i = e.target,
                    I = R.Util.findParentByClassName(i, "sapCpInputWidget");
                if (i.value) {
                    R.Widget.toggleMissingMandatory(I, false);
                }
                R.ContentPage.checkMissingMandatoryFieldsLabel(I);
            },
            handleDropDownChangeEvent: function(e) {
                var d = e.target;
                this.updateDropDownValue(d);
            },
            handleDatePickerDropDownChangeEvent: function(e) {
                var d = e.target,
                    D = d.parentNode;
                this.updateDatePickerValues(D);
            },
            handleCountryDropDownChangeEvent: function(e) {
                var s = this.findSelectedCountryCode(e.srcElement),
                    r = R.Util.findSiblingNodeByClassName(e.srcElement, "sapCpContactAttribute-REGION"),
                    S;
                if (r) {
                    S = r.getElementsByTagName("select")[0];
                    this.updateRegionValues(S, s);
                    S.disabled = !s;
                }
            },
            createOptionElement: function(r) {
                var o;
                if (r) {
                    o = document.createElement("option");
                    o.label = r.label;
                    o.value = r.value;
                    o.selected = r.selected;
                    o.text = r.text;
                    return o;
                }
                return null;
            },
            updateRegionValues: function(s, S) {
                var i, r, o;
                if (!s.aBufferedRegions) {
                    s.aBufferedRegions = [];
                    for (i = 0; i < s.options.length; i++) {
                        o = s.options[i];
                        r = {};
                        r.label = o.label;
                        r.value = o.value;
                        r.selected = o.selected;
                        r.text = o.text;
                        s.aBufferedRegions.push(r);
                    }
                }
                s.innerHTML = "";
                if (S) {
                    for (i = 0; i < s.aBufferedRegions.length; i++) {
                        r = s.aBufferedRegions[i];
                        if ((r.value.indexOf(S) === 0) || !r.value) {
                            if (r.selected && r.value) {
                                r.selected = false;
                            }
                            if (!S && !r.value) {
                                r.selected = true;
                            } else {
                                r.selected = false;
                            }
                            o = this.createOptionElement(r);
                            s.add(o);
                        }
                    }
                } else {
                    for (i = 0; i < s.aBufferedRegions.length; i++) {
                        r = s.aBufferedRegions[i];
                        if (!r.value) {
                            o = this.createOptionElement(r);
                            s.add(o);
                        }
                    }
                }
            },
            updateDropDownValue: function(d) {
                R.CSS.toggleClass(d, "sapCpDropDownPlaceholder", !d.value);
            },
            updateDatePickerValues: function(d) {
                var D = R.Node.getFirstWithClassName(d, "sapCpDatePickerDay"),
                    m = R.Node.getFirstWithClassName(d, "sapCpDatePickerMonth"),
                    y = R.Node.getFirstWithClassName(d, "sapCpDatePickerYear");
                if (!D || !m || !y) {
                    return;
                }
                var s = D.selectedOptions[0].value,
                    S = m.selectedOptions[0].value,
                    a = y.selectedOptions[0].value,
                    i = (parseInt(s, 10) || 0),
                    b = (parseInt(S, 10) || 0),
                    c = (parseInt(a, 10) || 0),
                    o = new Date(c, b, 0),
                    e = o.getDate(),
                    O = D.options.length,
                    f, I;
                if (i > e) {
                    D.selectedIndex = e.toString();
                }
                if (O > (e + 1)) {
                    for (I = O; I > (e + 1); I--) {
                        D.remove(I - 1);
                    }
                } else if (O < (e + 1)) {
                    for (I = O; I < (e + 1); I++) {
                        f = I;
                        this.addDatePickerDropDownOption(D, f);
                    }
                }
            },
            addDatePickerDropDownOption: function(d, v) {
                var V = v.toString(),
                    n;
                if (v < 10) {
                    V = "0" + V;
                }
                n = new Option(V, V);
                d.add(n);
            },
            checkValidity: function(i) {
                var r;
                var v = true;
                var I = "";
                if (i.type === "email") {
                    if (i.value) {
                        r = new RegExp(/^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/);
                        v = r.test(i.value);
                        if (!v) {
                            I = i.getAttribute("data-sap-cp-validationMessage");
                        }
                    }
                }
                if (i.type === "tel") {
                    if (i.value) {
                        r = new RegExp("^\\+(?:[0-9] ?){6,28}[0-9]$");
                        v = r.test(i.value);
                        if (!v) {
                            I = i.getAttribute("data-sap-cp-validationMessage");
                        }
                    }
                }
                if (i.id === "__input55") {
                    
                    var valor = i.value.replace('.', '');
                    // Despejar Guión
                    valor = valor.replace('-', '');

                    // Aislar Cuerpo y Dígito Verificador
                    var cuerpo = valor.slice(0, -1);
                    var dv = valor.slice(-1).toUpperCase();

                    // Formatear RUN
                    i.value = cuerpo + '-' + dv

                    // Si no cumple con el mínimo ej. (n.nnn.nnn)
                    if (cuerpo.length < 7) {
                        i.setCustomValidity("RUT Incompleto");
                        return false;
                    }

                    // Calcular Dígito Verificador
                    var suma = 0;
                    var multiplo = 2;

                    // Para cada dígito del Cuerpo
                    for (var itera = 1; itera <= cuerpo.length; itera++) {

                        // Obtener su Producto con el Múltiplo Correspondiente
                        var index = multiplo * valor.charAt(cuerpo.length - itera);

                        // Sumar al Contador General
                        suma = suma + index;

                        // Consolidar Múltiplo dentro del rango [2,7]
                        if (multiplo < 7) {
                            multiplo = multiplo + 1;
                        } else {
                            multiplo = 2;
                        }

                    }

                    // Calcular Dígito Verificador en base al Módulo 11
                    var dvEsperado = 11 - (suma % 11);

                    // Casos Especiales (0 y K)
                    dv = (dv == 'K') ? 10 : dv;
                    dv = (dv == 0) ? 11 : dv;
                    
                    // Validar que el Cuerpo coincide con su Dígito Verificador
                    if (dvEsperado != dv) {
                        I = i.getAttribute("data-sap-cp-validationMessage");
                    }
                }
                if (i.setCustomValidity) {
                    i.setCustomValidity(I);
                    i.title = I;
                } else {
                    i.title = I;
                }
                return v;
            },
            collectAnswer: function(i, c) {
                var I = R.Widget.isMandatory(i),
                    o = R.Node.getFirstWithClassName(i, "sapCpInput"),
                    a = R.Node.getFirstWithClassName(i, "sapCpCheckBox"),
                    d = R.Node.getFirstWithClassName(i, "sapCpDatePicker"),
                    D = R.Node.getFirstWithClassName(i, "sapCpDropDown"),
                    b, s, e;
                if (o) {
                    e = !this.checkValidity(o);
                    s = o.value;
                } else if (a) {
                    b = a.getElementsByTagName("input");
                    if (b[0]) {
                        s = (b[0].checked ? "X" : "");
                    }
                } else if (d) {
                    var y = R.Node.getFirstWithClassName(d, "sapCpDatePickerYear"),
                        m = R.Node.getFirstWithClassName(d, "sapCpDatePickerMonth"),
                        f = R.Node.getFirstWithClassName(d, "sapCpDatePickerDay");
                    if (y && m && f) {
                        s = y.value + m.value + f.value;
                    }
                    if (!/^[0-9]{8}$/.test(s)) {
                        s = "";
                    }
                } else if (D) {
                    s = D.value;
                }
                if (I && !s) {
                    c(false);
                } else if (e) {
                    c(null);
                } else {
                    var A = {
                        WidgetKeyHash: R.Setting.get(i, "key"),
                        WidgetValueKeyHash: "",
                        Value: s
                    };
                    c(A);
                }
            }
        },
        CheckBoxWidget: {
            prepare: function(c) {
                var i = R.Widget.isMandatory(c),
                    o;
                if (!i) {
                    return;
                }
                o = c.getElementsByTagName("input")[0];
                if (o) {
                    R.Event.registerListener(o, "focusout", this.handleCheckBoxFocusOutEvent.bind(this));
                }
            },
            applyPersonalization: function(c, v) {
                var o;
                o = c.getElementsByTagName("input")[0];
                if (o) {
                    o.checked = (o.checked || !!v);
                }
            },
            handleCheckBoxFocusOutEvent: function(e) {
                var c = e.target,
                    o = R.Util.findParentByClassName(c, "sapCpCheckBoxWidget");
                if (c.checked) {
                    R.Widget.toggleMissingMandatory(o, false);
                }
                R.ContentPage.checkMissingMandatoryFieldsLabel(o);
            },
            collectAnswer: function(c, f) {
                var i = R.Widget.isMandatory(c),
                    o = c.getElementsByTagName("input")[0],
                    b = false;
                if (o) {
                    b = o.checked;
                }
                if (i && !b) {
                    f(false);
                } else {
                    var a = {
                        WidgetKeyHash: R.Setting.get(c, "key"),
                        WidgetValueKeyHash: "",
                        Value: (b ? "X" : "")
                    };
                    f(a);
                }
            }
        },
        NoteWidget: {
            collectAnswer: function(n, c) {
                var w = R.Widget.isMandatory(n),
                    t = n.getElementsByTagName("textarea"),
                    N;
                if (t[0]) {
                    N = t[0].value;
                }
                if (w && !N) {
                    c(false);
                } else {
                    var a = {
                        WidgetKeyHash: R.Setting.get(n, "key"),
                        WidgetValueKeyHash: "",
                        Value: N
                    };
                    c(a);
                }
            }
        },
        DownloadWidget: {
            prepare: function(d) {
                var w = R.Widget.isMandatory(d),
                    c;
                if (!w) {
                    return;
                }
                c = d.getElementsByTagName("input");
                if (c[0]) {
                    R.Event.registerListener(c[0], "focusout", this.handleCheckBoxFocusOutEvent.bind(this));
                }
            },
            handleCheckBoxFocusOutEvent: function(e) {
                var c = e.target,
                    d = R.Util.findParentByClassName(c, "sapCpDownloadWidget");
                if (c.checked) {
                    R.Widget.toggleMissingMandatory(d, false);
                }
                R.ContentPage.checkMissingMandatoryFieldsLabel(d);
            },
            collectAnswer: function(d, c) {
                var w = R.Widget.isMandatory(d),
                    a = d.getElementsByTagName("input"),
                    b = false;
                if (a[0]) {
                    b = a[0].checked;
                }
                if (w && !b) {
                    c(false);
                } else {
                    var A = {
                        WidgetKeyHash: R.Setting.get(d, "key"),
                        WidgetValueKeyHash: "",
                        Value: (b ? "X" : "")
                    };
                    c(A);
                }
            }
        },
        InteractionWidget: {
            prepare: function(i) {
                var w = R.Widget.isMandatory(i),
                    c;
                if (!w) {
                    return;
                }
                c = i.getElementsByTagName("input");
                if (c[0]) {
                    R.Event.registerListener(c[0], "focusout", this.handleCheckBoxFocusOutEvent.bind(this));
                }
            },
            handleCheckBoxFocusOutEvent: function(e) {
                var c = e.target,
                    i = R.Util.findParentByClassName(c, "sapCpInteractionWidget");
                if (c.checked) {
                    R.Widget.toggleMissingMandatory(i, false);
                }
                R.ContentPage.checkMissingMandatoryFieldsLabel(i);
            },
            collectAnswer: function(i, c) {
                var w = R.Widget.isMandatory(i),
                    a = i.getElementsByTagName("input"),
                    b = false;
                if (a[0]) {
                    b = a[0].checked;
                }
                if (w && !b) {
                    c(false);
                } else {
                    var A = {
                        WidgetKeyHash: R.Setting.get(i, "key"),
                        WidgetValueKeyHash: "",
                        Value: (b ? "X" : "")
                    };
                    c(A);
                }
            }
        },
        CaptchaWidget: {
            collectAnswer: function(c, f) {
                R.CaptchaWidget.fetchCaptchaToken(c, function(s) {
                    var a = {
                        WidgetKeyHash: R.Setting.get(c, "key"),
                        WidgetValueKeyHash: "",
                        Value: R.CaptchaWidget.buildAnswerValue(c, s)
                    };
                    f(a);
                });
            },
            fetchCaptchaToken: function(c, f) {
                var s = R.Setting.get(c, "captcha-sitekey"),
                    a = R.Setting.get(c, "captcha-action");
                window.grecaptcha.ready(function() {
                    window.grecaptcha.execute(s, {
                        action: a
                    }).then(function(b) {
                        f(b);
                    });
                });
            },
            buildAnswerValue: function(c, s) {
                var a = R.Setting.get(c, "captcha-key");
                if (!s) {
                    return "";
                }
                if (!a) {
                    return s;
                }
                return "SAP_CAPTCHA_TOKEN:::" + a + ":::" + s;
            }
        },
        ButtonWidget: {
            prepare: function(b) {
                var B;
                B = b.getElementsByTagName("button");
                if (B[0]) {
                    R.Event.registerListener(B[0], "click", this.handleButtonClickEvent.bind(this));
                }
            },
            handleButtonClickEvent: function(e) {
                var b = e.target,
                    B = R.Util.findParentByClassName(b, "sapCpButtonWidget");
                if (e.preventDefault) {
                    e.preventDefault();
                }
                R.Result.sendSubmit(B);
            },
            collectAnswer: function(b, c, f) {
                if (b === c) {
                    var a = {
                        WidgetKeyHash: R.Setting.get(b, "key"),
                        WidgetValueKeyHash: "",
                        Value: "X"
                    };
                    f(a);
                } else {
                    f();
                }
            },
            performFollowUpAction: function(b, c, f) {
                var F = R.Setting.get(b, "follow-up-action");
                if ((!F || F === R.Constants.FollowUpAction.FollowUpPage) && f) {
                    this.openFollowUpPage(f);
                } else {
                    R.ContentPage.toggleSuccessMessage(c, true);
                }
            },
            openFollowUpPage: function(f) {
                var F = R.Util.appendOutboundId(f);
                R.Util.openPage(window, F);
            },
            toggleDownloadLinkVisible: function(l, s) {
                R.CSS.toggleClass(l, "sapCpButtonWidgetDownloadLinkVisible", s);
            },
            toggleLoading: function(b, l) {
                var L = (typeof l === "undefined" ? !R.CSS.hasClass(b, "sapCpButtonWidgetLoading") : l),
                    B = b.getElementsByTagName("button"),
                    i;
                R.CSS.toggleClass(b, "sapCpButtonWidgetLoading", L);
                for (i = 0; i < B.length; i++) {
                    if (L) {
                        B[i].setAttribute("disabled", "disabled");
                    } else {
                        B[i].removeAttribute("disabled");
                    }
                }
            }
        },
        Result: {
            sendOpen: function(c, f) {
                var p = (R.Setting.get(c, "prefill-data") === "true"),
                    o = R.Result.buildOpen(c, p);
                R.Request.postResult(c, o, function(r) {
                    f(c, r);
                });
                if (!p) {
                    f(c, true);
                }
            },
            sendSubmit: function(c) {
                var o = R.Util.findParentByClassName(c, "sapCpContentPage");
                R.Result.buildSubmit(o, c, function(s) {
                    var v = true;
                    R.ContentPage.toggleErrorMessage(o, false);
                    R.ContentPage.toggleSuccessMessage(o, false);
                    if (o.checkValidity) {
                        v = o.checkValidity();
                        R.ContentPage.toggleInvalid(o, !v);
                        if (o.reportValidity) {
                            o.reportValidity();
                        }
                    }
                    if (v && s) {
                        R.ContentPage.toggleMissingMandatoryField(o, false);
                        R.ButtonWidget.toggleLoading(c, true);
                        R.Result.sendRequestC4();
                        R.Request.postResult(o, s, function(r) {
                            R.Result.handleSubmitResponse(r, o, c);
                            R.ButtonWidget.toggleLoading(c, false);
                        });
                    } else {
                        R.ContentPage.toggleMissingMandatoryField(o, true);
                    }
                });
            },
            buildOpen: function(c, p) {
                var r = this.buildResult(c, "OPEN");
                if (p) {
                    r.ContactPersonalizationData = [];
                }
                return r;
            },
            buildSubmit: function(c, o, f) {
                var r, m;
                r = this.buildResult(c, "SUBMIT");
                R.ContentPage.collectAnswers(c, o, function(a) {
                    m = !a;
                    R.ContentPage.toggleMissingMandatoryField(c, m);
                    if (m) {
                        f(null);
                        return;
                    }
                    r.Answers = a;
                    r.ResultValues = [];
                    f(r);
                });
            },
            buildResult: function(c, e) {
                var l = c.getElementsByClassName("sapCpLayout")[0];
                var r = {
                    ResultEvent: e,
                    ContentPageKeyHash: R.Setting.get(c, "key"),
                    LayoutKeyHash: R.Setting.get(l, "key"),
                    Url: R.Util.getCurrentUrl()
                };
                if (R.Setting.get(c, "lpkey")) {
                    r.LandingPageKeyHash = R.Setting.get(c, "lpkey");
                }
                if (R.ContentPage.isProductiveTestMode(c)) {
                    r.ProductiveTestMode = true;
                }
                var o = R.Util.getOutboundId();
                if (o) {
                    r.OutboundId = o;
                }
                var s = R.Util.getCampaignId();
                if (s) {
                    r.CampaignId = s;
                }
                return r;
            },
            handleSubmitResponse: function(r, c, o) {
                if (R.Request.isErrorResponse(r)) {
                    var e = (r && r.error && r.error.message && r.error.message.value || "Error");
                    if (this.checkMessagePresentable(r)) {
                        R.ContentPage.setErrorMessage(c, e);
                    } else {
                        R.ContentPage.setErrorMessage(c);
                    }
                    R.Console.warn(e);
                    R.ContentPage.toggleErrorMessage(c, true);
                    return;
                }
                if (r.ResultValues && r.ResultValues.results) {
                    this.handleResultValues(r.ResultValues.results, o);
                }
                R.ButtonWidget.performFollowUpAction(o, c, r.FollowUpPage);
            },
            checkMessagePresentable: function(r) {
                var b = false;
                var e;
                if (r && r.error && r.error.code) {
                    if (r.error.code.indexOf("HPA_COMMON/") === 0) {
                        e = r.error.code.substring(11);
                        if (e === "415" || (e >= 420 && e <= 428)) {
                            b = true;
                        }
                    }
                    if (r.error.code.indexOf("CUAN_CONTENT_PAGE/") === 0) {
                        b = true;
                    }
                }
                return b;
            },
            handleResultValues: function(r, c) {
                var m, i;
                for (i = 0; i < r.length; i++) {
                    m = r[i];
                    if (m.WidgetValueName === R.Constants.WidgetValueName.DownloadURI) {
                        this.handleDownloadURI(m, c);
                    }
                }
            },
            handleDownloadURI: function(d, b) {
                var D = d.Value,
                    l, L, s, i;
                R.Util.openDownload(window, D);
                l = R.Node.getAllWithClassName(b, "sapCpLink");
                for (i = 0; i < l.length; i++) {
                    L = l[i];
                    s = R.Setting.get(L, "download-key");
                    if (s === d.WidgetKeyHash) {
                        L.href = D;
                        R.ButtonWidget.toggleDownloadLinkVisible(L, true);
                        break;
                    }
                }
            },
            sendRequestC4:function(){
                var Nombre = $("#__input52").val();
                var Apellido = $("#__input53").val();
                var NombreEmpresa = $("#__input54").val();
                var Rut = $("#__input55").val();
                var Email = $("#__input57").val();
                var Telefono = $("#__input56").val();
                var Comuna = $("#__down10").val();
                var dataString = 
                {
                    "Nombre":Nombre,
                    "Apellido":Apellido,
                    "NombreEmpresa":NombreEmpresa,
                    "Rut":Rut,
                    "Email":Email,
                    "Telefono":Telefono,
                    "Comuna":Comuna,
                };
                $.ajax({
                    url: 'integracionC4C.php',
                    type: "POST",
                    data: dataString,
                    asycn:false,

                    success: function(data) {
                        //document.getElementById('respuesta').innerHTML = data;

                    },
                    error: function(xhr, ajaxOptions, thrownError) {
                        console.log(xhr.status);
                        console.log(thrownError);
                    }
                });
            }
        },
        Request: {
            buildRequest: function(c, m, p) {
                var M = m,
                    P = this.appendScenarioParameter(p, c),
                    h = new XMLHttpRequest();
                if (C.CORS && !("withCredentials" in h)) {
                    if (typeof XDomainRequest === "function") {
                        h = new XDomainRequest();
                        if (M === "HEAD") {
                            M = "GET";
                        }
                    } else {
                        R.Console.warn("Cross-Domain requests are not supported in your browser.");
                        return null;
                    }
                }
                h.open(M, P, true);
                this.setRequestHeaders(h, c);
                h.withCredentials = true;
                return h;
            },
            appendScenarioParameter: function(p, c) {
                var P = p,
                    m = R.getConfig(c);
                if (m.AppendScenarioParameter) {
                    var s = "scenario=LPI",
                        t = "tenant=" + m.Tenant,
                        a = [s, t].join("&");
                    P += "?" + m.AppendScenarioParameter + "=" + btoa(a);
                }
                return P;
            },
            setRequestHeaders: function(h, c) {
                if (h.setRequestHeader) {
                    var m = R.getConfig(c);
                    h.setRequestHeader("Content-Type", "application/json");
                    h.setRequestHeader("Accept", "application/json");
                    if (m.CSRFTokenHeader) {
                        h.setRequestHeader(m.CSRFTokenHeader, (c.sapCpCSRFToken || "Fetch"));
                    }
                    return true;
                }
                return false;
            },
            send: function(h, d, s, e) {
                if (h instanceof XMLHttpRequest) {
                    h.onreadystatechange = function() {
                        if (h.DONE && h.readyState !== h.DONE || h.readyState !== XMLHttpRequest.DONE) {
                            return;
                        }
                        if (h.status >= 200 && h.status < 300) {
                            s(h);
                        } else {
                            e(h);
                        }
                    };
                } else {
                    h.onload = function() {
                        s(h);
                    };
                    h.onerror = function() {
                        e(h);
                    };
                    h.onprogress = function() {};
                    h.ontimeout = function() {};
                }
                if (d) {
                    h.send(JSON.stringify(d));
                } else {
                    h.send();
                }
            },
            fetchToken: function(c, f, u) {
                var h = (u ? "GET" : "HEAD"),
                    i, o, m, H;
                for (i = 0; i < c.length; i++) {
                    o = c[i];
                    m = R.getConfig(o);
                    H = this.buildRequest(o, h, m.BasePath);
                    if (!m.CSRFTokenHeader) {
                        f([o], true);
                        return;
                    }
                    this.send(H, null, function() {
                        if (H.getResponseHeader) {
                            o.sapCpCSRFToken = H.getResponseHeader(m.CSRFTokenHeader);
                        }
                        f([o], true);
                    }, function() {
                        if (!u) {
                            R.Request.fetchToken([o], f, true);
                        } else {
                            R.Console.warn("Technical error occurred.");
                            f([o], false);
                        }
                    });
                }
            },
            postResult: function(c, r, f) {
                var m = R.getConfig(c),
                    s = m.BasePath + m.ResultHeadersPath,
                    h = this.buildRequest(c, "POST", s);
                this.send(h, r, function() {
                    var a = JSON.parse(h.responseText);
                    if (typeof a === "string") {
                        a = JSON.parse(a);
                    }
                    a = (a && a.d || a);
                    f(a);
                }, function() {
                    R.Console.warn("Technical error occurred.");
                    var a = null;
                    if (h.responseText) {
                        a = JSON.parse(h.responseText);
                    }
                    f(a);
                });
            },
            isErrorResponse: function(r) {
                if (!r) {
                    return true;
                }
                return !!r.error;
            }
        },
        Setting: {
            get: function(n, s) {
                return n.getAttribute("data-sap-cp-" + s);
            }
        },
        Node: {
            getAllWithClassName: function(n, c) {
                if (n.getElementsByClassName) {
                    return n.getElementsByClassName(c);
                }
                if (n.querySelectorAll) {
                    return n.querySelectorAll("." + c);
                }
                R.Console.warn("Browser not supported!");
                return [];
            },
            getFirstWithClassName: function(n, c) {
                var N = R.Node.getAllWithClassName(n, c);
                if (N && N[0]) {
                    return N[0];
                }
                return null;
            },
            createEmptyOptionElement: function(r) {
                var e;
                e = document.createElement("option");
                e.value = "";
                e.selected = "selected";
                return e;
            }
        },
        CSS: {
            getClasses: function(n) {
                if (n.classList) {
                    return n.classList;
                }
                var c = n.getAttribute("class");
                return c.split(" ");
            },
            setClasses: function(n, c) {
                var s = c.join(" ");
                n.setAttribute("class", s);
            },
            hasClass: function(n, c) {
                if (n.classList && n.classList.contains) {
                    return n.classList.contains(c);
                }
                var a = this.getClasses(n);
                var i = a.indexOf(c);
                return (i >= 0);
            },
            addClass: function(n, c) {
                if (n.classList && n.classList.add) {
                    n.classList.add(c);
                    return;
                }
                var h = this.hasClass(n, c);
                if (h) {
                    return;
                }
                var a = this.getClasses(n);
                a.push(c);
                this.setClasses(n, a);
            },
            removeClass: function(n, c) {
                if (n.classList && n.classList.remove) {
                    n.classList.remove(c);
                    return;
                }
                var h = this.hasClass(n, c);
                if (!h) {
                    return;
                }
                var a = this.getClasses(n);
                var i = a.indexOf(c);
                a.splice(i, 1);
                this.setClasses(n, a);
            },
            toggleClass: function(n, c, a) {
                var A = a;
                if (typeof A === "undefined") {
                    A = !this.hasClass(n, c);
                }
                if (A) {
                    return this.addClass(n, c);
                }
                return this.removeClass(n, c);
            }
        },
        Util: {
            findSiblingNodeByClassName: function(n, c) {
                var o = R.Util.findParentByClassName(n, "sapCpContentPage");
                return o.getElementsByClassName(c)[0];
            },
            findParentByClassName: function(n, c) {
                if (!n || !c) {
                    return null;
                }
                if (R.CSS.hasClass(n, c)) {
                    return n;
                }
                var p = n.parentNode;
                if (!p || p === n || p === document) {
                    return null;
                }
                return this.findParentByClassName(p, c);
            },
            findWidgetByKey: function(w, W) {
                var o, i;
                for (i = 0; i < w.length; i++) {
                    o = w[i];
                    if (R.Setting.get(o, "key") === W) {
                        return o;
                    }
                }
                return null;
            },
            getCurrentUrl: function() {
                if (window !== window.top) {
                    return document.referrer;
                }
                return window.location.href;
            },
            getOutboundId: function() {
                return this.getURLParameter("sap-outbound-id");
            },
            getCampaignId: function() {
                return this.getURLParameter("sap-campaign-id");
            },
            getURLParameter: function(p) {
                var q = window.location.search.substring(1).split("&");
                for (var i = 0; i < q.length; i++) {
                    var P = q[i].split("="),
                        n = decodeURIComponent(P[0]);
                    if (n === p) {
                        return decodeURIComponent(P[1]);
                    }
                }
                return null;
            },
            appendOutboundId: function(u, o) {
                var O = (o || R.Util.getOutboundId());
                if (O) {
                    return R.Util.appendURLParameter(u, "sap-outbound-id", O);
                }
                return u;
            },
            appendURLParameter: function(u, p, P) {
                var s = p + "=" + P;
                if (u.indexOf("?") > 0) {
                    return u.split("?")[0] + "?" + s + "&" + u.split("?")[1];
                } else if (u.indexOf("#") > 0) {
                    return u.split("#")[0] + "?" + s + "#" + u.split("#")[1];
                }
                return u + "?" + s;
            },
            prefixHttpProtocol: function(u) {
                var s = u.indexOf("/"),
                    d = u.indexOf("."),
                    p = u.indexOf("://");
                if (s === 0 || d === 0) {
                    return u;
                }
                if (p < 0 || s !== p + 1) {
                    return "http://" + u;
                }
                return u;
            },
            openPage: function(w, p) {
                if (!p) {
                    return;
                }
                var P = R.Util.prefixHttpProtocol(p);
                w.location.href = P;
            },
            openDownload: function(w, d) {
                if (!d) {
                    return;
                }
                var D = this.prefixHttpProtocol(d);
                w.open(D, "_blank");
            }
        },
        Event: {
            registerListener: function(n, e, l) {
                if (n.addEventListener) {
                    return n.addEventListener(e, l);
                }
                if (n.attachEvent) {
                    return n.attachEvent("on" + e, l);
                }
                R.Console.warn("Browser not supported!");
                return false;
            }
        },
        Console: {
            warn: function(m) {
                if (window.console && window.console.warn) {
                    window.console.warn(m);
                }
            }
        },
        Constants: {
            WidgetValueName: {
                DownloadURI: "DOWNLOAD_URI"
            },
            FollowUpAction: {
                FollowUpPage: "01",
                SuccessMessage: "02"
            }
        }
    };
    window.sap = (window.sap || {});
    window.sap.hpa = (window.sap.hpa || {});
    window.sap.hpa.cei = (window.sap.hpa.cei || {});
    window.sap.hpa.cei.cntpg = (window.sap.hpa.cei.cntpg || {});
    window.sap.hpa.cei.cntpg.run = (window.sap.hpa.cei.cntpg.run || R);
    if (window.sap.hpa.cei.cntpg.testEnvironment) {
        return;
    }
    R.Event.registerListener(document, "DOMContentLoaded", function() {
        R.initialize();
    });
    if (document.readyState === "complete" || document.readyState === "loaded" || document.readyState === "interactive") {
        R.initialize();
    }
}());