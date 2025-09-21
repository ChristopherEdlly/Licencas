let
    // ================== UTILIDADES SEGURAS ==================
    SafeText = (v as any) as text =>
        if v = null then ""
        else if Value.Is(v, type text) then v
        else if Value.Is(v, type number) then Number.ToText(v)
        else if Value.Is(v, type date) then Date.ToText(v, "dd/MM/yyyy")
        else Text.From(v),

    TextSafeContains = (source as any, fragment as text) as logical =>
        let s = SafeText(source) in if fragment = null or fragment = "" then false else Text.Contains(s, fragment),

    TextSafeAfter = (source as any, delimiter as text, optional occurrence as any) as nullable text =>
        let s = SafeText(source) in
            if delimiter = null or delimiter = "" or not Text.Contains(s, delimiter)
            then null
            else
                try if occurrence = null
                     then Text.AfterDelimiter(s, delimiter)
                     else Text.AfterDelimiter(s, delimiter, occurrence)
                otherwise null,

    TextSafeBefore = (source as any, delimiter as text, optional occurrence as any) as nullable text =>
        let s = SafeText(source) in
            if delimiter = null or delimiter = "" or not Text.Contains(s, delimiter)
            then null
            else
                try if occurrence = null
                     then Text.BeforeDelimiter(s, delimiter)
                     else Text.BeforeDelimiter(s, delimiter, occurrence)
                otherwise null,

    // ================== HELPERS ==================
    RemoveDiacritics = (s as any) as text =>
        let
            st   = SafeText(s),
            chars= Text.ToList(st),
            map  = [
                #"á"="a",#"à"="a",#"â"="a",#"ã"="a",#"ä"="a",
                #"Á"="A",#"À"="A",#"Â"="A",#"Ã"="A",#"Ä"="A",
                #"é"="e",#"è"="e",#"ê"="e",#"ë"="e",
                #"É"="E",#"È"="E",#"Ê"="E",#"Ë"="E",
                #"í"="i",#"ì"="i",#"î"="i",#"ï"="i",
                #"Í"="I",#"Ì"="I",#"Î"="I",#"Ï"="I",
                #"ó"="o",#"ò"="o",#"ô"="o",#"õ"="o",#"ö"="o",
                #"Ó"="O",#"Ò"="O",#"Ô"="O",#"Õ"="O",#"Ö"="O",
                #"ú"="u",#"ù"="u",#"û"="u",#"ü"="u",
                #"Ú"="U",#"Ù"="U",#"Û"="U",#"Ü"="Ü",
                #"ç"="c",#"Ç"="C"
            ],
            repl = List.Transform(chars, each Record.FieldOrDefault(map, _, _)),
            out  = Text.Combine(repl, "")
        in out,

    NormalizeText = (s as any) as text =>
        let
            t0 = SafeText(s),
            t1 = Text.Lower(t0),
            t2 = Text.Trim(t1),
            t3 = Text.Replace(Text.Replace(t2, "–", "-"), "—", "-"),
            t4 = RemoveDiacritics(t3),
            t5 = Text.Replace(t4, Character.FromNumber(160), " "),
            parts = List.Select(Text.Split(t5, " "), each _ <> ""),
            t6 = Text.Combine(parts, " ")
        in t6,

    ToYear = (y as number) as number => if y < 100 then 2000 + y else y,

    MonthNameToNum = (name as nullable text) as nullable number =>
        let
            n1 = if name = null then null else NormalizeText(Text.Replace(SafeText(name), ".", "")),
            map = [
                janeiro=1, jan=1,
                fevereiro=2, fev=2,
                marco=3, mar=3,
                abril=4, abr=4,
                maio=5, mai=5,
                junho=6, jun=6,
                julho=7, jul=7,
                agosto=8, ago=8,
                setembro=9, set=9,
                outubro=10, out=10,
                novembro=11, nov=11,
                dezembro=12, dez=12
            ],
            v = if n1 = null then null else Record.FieldOrDefault(map, n1)
        in if v = null then null else Number.From(v),

    NumWordToInt = (w as nullable text) as number =>
        let
            w0 = NormalizeText(if w = null then "" else Text.Replace(SafeText(w), ".", "")),
            map = [
                uma=1, um=1, #"1"=1,
                duas=2, dois=2, #"2"=2,
                tres=3, #"3"=3,
                quatro=4, #"4"=4,
                cinco=5, #"5"=5,
                seis=6, #"6"=6,
                sete=7, #"7"=7,
                oito=8, #"8"=8,
                nove=9, #"9"=9,
                dez=10, #"10"=10,
                onze=11, #"11"=11,
                doze=12, #"12"=12
            ],
            v = Record.FieldOrDefault(map, w0, 1)
        in Number.From(v),

    FormatDate = (d as date) as text => Date.ToText(d, "yyyy-MM-dd", "en-US"),

    IsDigits = (t as any) as logical =>
        let txt = SafeText(t),
            nonEmpty = Text.Length(txt) > 0,
            chars = Text.ToList(txt),
            allDigits = nonEmpty and List.AllTrue(List.Transform(chars, each _ >= "0" and _ <= "9"))
        in allDigits,

    ExtractNumbers = (t as any) as list =>
        let
            txt   = SafeText(t),
            tokens= Text.SplitAny(txt, " -.,;()[]/"),
            nums  = List.Transform(tokens, each try Number.FromText(_) otherwise null),
            nums2 = List.RemoveNulls(nums)
        in nums2,

    TryParseDayMonthYear = (txt as any) as nullable date =>
        let
            s    = Text.Trim(SafeText(txt)),
            p    = Text.Split(s, "/"),
            res  =
                if List.Count(p) = 3 and IsDigits(p{0}) and IsDigits(p{1}) and IsDigits(p{2}) then
                    let
                        d   = Number.FromText(p{0}),
                        m   = Number.FromText(p{1}),
                        y   = ToYear(Number.FromText(p{2})),
                        dt  = try #date(y, m, d) otherwise null
                    in dt
                else null
        in res,

    TryParseMonthYear = (txt as any) as nullable date =>
        let
            t   = NormalizeText(SafeText(txt)),
            res =
                if Text.Contains(t, "/") then
                    let sp = Text.Split(t, "/") in
                        if List.Count(sp) = 2 then
                            let a = sp{0}, b = sp{1} in
                                if IsDigits(a) and IsDigits(b) then
                                    let m = Number.FromText(a), y = ToYear(Number.FromText(b)) in try #date(y, m, 1) otherwise null
                                else if (not IsDigits(a)) and IsDigits(b) then
                                    let m = MonthNameToNum(a), y = ToYear(Number.FromText(b)) in
                                        if m <> null then try #date(y, m, 1) otherwise null else null
                                else null
                        else null
                else if Text.Contains(t, " de ") then
                    let sp = Text.Split(t, " de "),
                        m  = MonthNameToNum(sp{0}),
                        y  = try Number.FromText(sp{1}) otherwise null
                    in if m <> null and y <> null then try #date(ToYear(Number.From(y)), Number.From(m), 1) otherwise null else null
                else null
        in res,

    MonthSpan = (start as date, finish as date, limit as number) as list =>
        let months =
            List.Generate(
                () => [i = 0, d = start],
                each [d] <= finish and [i] < limit * 2,
                each [i = [i] + 1, d = Date.AddMonths([d], 1)],
                each [d]
            )
        in months,

    // ================== PARSER PRINCIPAL ==================
    ParseCronograma = (cronograma as nullable text, meses_limit as number) as list =>
        let
            raw        = SafeText(cronograma),
            rawNull    = if Text.Trim(raw) = "" then null else raw,
            rawSafe    = if rawNull = null then "" else rawNull,
            s0         = if rawNull = null then null else NormalizeText(rawNull),
            s1         = if s0 = null then "" else Text.Replace(" " & SafeText(s0) & " ", " ate ", " - "),
            ambiguous  = Text.Contains(s1, "um mes (") and Text.Contains(s1, ") a cada ano"),

            resultInitial = {},

            AddDate = (lst as list, d as nullable date) as list =>
                if d = null then lst
                else
                    let t = FormatDate(d) in
                        if List.Contains(lst, t) then lst else List.Combine({lst, {t}}),

            // Datas dd/mm/yy explícitas para fallback de “de cada ano”
            tokensEarly       = Text.SplitAny(SafeText(s1), " ,.;:"),
            ddList            = List.RemoveNulls(List.Transform(tokensEarly, each TryParseDayMonthYear(_))),
            earliestExplicit  = if List.Count(ddList) > 0 then List.Min(ddList) else null,

            // ---------- A partir de ----------
            HandleAPartir = (lst as list) as list =>
                let
                    hasA    = TextSafeContains(s1, "a partir de"),
                    after   = if hasA then TextSafeAfter(s1, "a partir de ") else null,
                    yearly  = TextSafeContains(s1, "a cada ano") or
                              TextSafeContains(s1, "por ano") or
                              TextSafeContains(s1, "uma por ano") or
                              TextSafeContains(s1, "1 mes a cada ano"),

                    ddmmyyyy =
                        if after <> null and Text.Contains(after, "/") then
                            let firstTok = Text.BeforeDelimiter(after & " ", " ") in TryParseDayMonthYear(firstTok)
                        else null,

                    lst1 =
                        if hasA and ddmmyyyy <> null then
                            let base = ddmmyyyy in
                                if yearly then
                                    List.Accumulate({0..meses_limit-1}, lst, (acc,i)=> AddDate(acc, Date.AddYears(base, i)))
                                else
                                    List.Accumulate({0..meses_limit-1}, lst, (acc,i)=> AddDate(acc, Date.AddMonths(base, i)))
                        else lst,

                    mmyyyyT =
                        if hasA and ddmmyyyy = null and after <> null and Text.Contains(after, "/") then
                            TryParseMonthYear(Text.BeforeDelimiter(after & " ", " "))
                        else null,

                    lst2 =
                        if hasA and mmyyyyT <> null then
                            let base = mmyyyyT in
                                if yearly then
                                    List.Accumulate({0..meses_limit-1}, lst1, (acc,i)=> AddDate(acc, Date.AddYears(base, i)))
                                else
                                    List.Accumulate({0..meses_limit-1}, lst1, (acc,i)=> AddDate(acc, Date.AddMonths(base, i)))
                        else lst1,

                    monDe =
                        if hasA and ddmmyyyy = null and mmyyyyT = null and after <> null then
                            let seg = Text.BeforeDelimiter(after & ",", ",") in TryParseMonthYear(seg)
                        else null,

                    lst3 =
                        if hasA and monDe <> null then
                            let base = monDe in
                                if yearly then
                                    List.Accumulate({0..meses_limit-1}, lst2, (acc,i)=> AddDate(acc, Date.AddYears(base, i)))
                                else
                                    List.Accumulate({0..meses_limit-1}, lst2, (acc,i)=> AddDate(acc, Date.AddMonths(base, i)))
                        else lst2
                in lst3,

            // ---------- Listas / intervalos explícitos ----------
            HandleLists = (lst as list) as list =>
                let
                    normalized = Text.Replace(Text.Replace(rawSafe, "\n", ";"), " e ", ";"),
                    parts      = List.Select(List.Transform(Text.Split(normalized, ";"), each Text.Trim(_)), each _ <> ""),
                    fold =
                        List.Accumulate(
                            parts,
                            lst,
                            (acc as list, p as text) =>
                                let
                                    pn       = NormalizeText(p),
                                    pn2      = Text.Trim(Text.Replace(" " & pn & " ", " ate ", " - ")),
                                    hasParen = Text.Contains(pn2, "(") and Text.Contains(pn2, ")"),
                                    count    = if hasParen then NumWordToInt(Text.BetweenDelimiters(pn2, "(", ")")) else 1,
                                    basePart = if hasParen then Text.Trim(Text.BeforeDelimiter(pn2, "(")) else pn2,

                                    acc1 =
                                        if Text.Contains(basePart, " - ") then
                                            let
                                                a   = Text.Trim(Text.BeforeDelimiter(basePart, " - ")),
                                                b   = Text.Trim(Text.AfterDelimiter(basePart, " - ")),
                                                sa  = TryParseMonthYear(a),
                                                sb  = TryParseMonthYear(b),
                                                seq = if sa <> null and sb <> null then MonthSpan(sa, sb, meses_limit) else {},
                                                accr= List.Accumulate(seq, acc, (aacc,d)=> AddDate(aacc, d))
                                            in accr
                                        else acc,

                                    acc2 =
                                        if not Text.Contains(basePart, " - ") then
                                            let
                                                tokens = Text.SplitAny(basePart, " ,.:"),
                                                accd =
                                                    List.Accumulate(
                                                        tokens,
                                                        acc1,
                                                        (aacc as list, tok as text)=>
                                                            let
                                                                d  = TryParseDayMonthYear(tok),
                                                                a1 = AddDate(aacc, d),
                                                                a2 = if Text.Contains(tok, "/") then AddDate(a1, TryParseMonthYear(tok)) else a1
                                                            in a2
                                                    )
                                            in accd
                                        else acc1,

                                    acc3 =
                                        if not Text.Contains(basePart, " - ") then
                                            let
                                                md  = TryParseMonthYear(basePart),
                                                accm= if md <> null then AddDate(acc2, md) else acc2
                                            in accm
                                        else acc2,

                                    acc4 =
                                        if hasParen then
                                            let
                                                bdate = TryParseMonthYear(basePart),
                                                accp =
                                                    if bdate <> null then
                                                        List.Accumulate(
                                                            {0..count-1},
                                                            acc3,
                                                            (aacc,i)=> let next = Date.AddMonths(bdate, i) in AddDate(aacc, next)
                                                        )
                                                    else acc3
                                            in accp
                                        else acc3
                                in acc4
                        )
                in fold,

            // ---------- "de cada ano" ----------
            HandleCadaAno = (lst as list) as list =>
                let
                    hasCada = TextSafeContains(s1, " de cada ano"),
                    acc =
                        if hasCada then
                            let
                                before      = TextSafeBefore(s1, " de cada ano"),
                                words       = if before = null then {} else Text.Split(before, " "),
                                monName     = if List.Count(words) > 0 then words{List.Count(words)-1} else "",
                                mnum        = MonthNameToNum(monName),
                                baseYear =
                                    if TextSafeContains(s1, "a partir de ") then
                                        let aft = TextSafeAfter(s1, "a partir de ")
                                        in
                                            if aft = null then null else
                                            let nums = ExtractNumbers(aft) in if List.Count(nums) > 0 then Number.From(nums{0}) else null
                                    else null,
                                earliestPlus1 = if earliestExplicit <> null then Date.Year(earliestExplicit) + 1 else null,
                                startY =
                                    if baseYear <> null then baseYear
                                    else if earliestPlus1 <> null then earliestPlus1
                                    else null,
                                acc1 =
                                    if mnum <> null and startY <> null then
                                        List.Accumulate({0..meses_limit-1}, lst, (aacc,i)=> AddDate(aacc, #date(startY + i, mnum, 1)))
                                    else lst
                            in acc1
                        else lst
                in acc,

            // ---------- "uma por ano" / "a cada ano" genérico ----------
            HandleUmaPorAno = (lst as list) as list =>
                let
                    cond   = (TextSafeContains(s1, "uma por ano") or TextSafeContains(s1, "a cada ano")) and Text.Contains(s1, "/"),
                    tokens = Text.SplitAny(s1, " ,.;:"),
                    cand   = List.Select(tokens, each Text.Contains(_, "/")),
                    pick   = if List.Count(cand) > 0 then cand{0} else null,
                    base   = if pick <> null then TryParseMonthYear(pick) else null,
                    acc    = if cond and base <> null
                             then List.Accumulate({0..meses_limit-1}, lst, (aacc,i)=> AddDate(aacc, Date.AddYears(base, i)))
                             else lst
                in acc,

            // ---------- "Inicio em ..." (sequência mensal) ----------
            HandleInicioEm = (lst as list) as list =>
                let
                    norm         = s1,
                    hasInicio    = TextSafeContains(norm, "inicio em "),
                    after        = if hasInicio then TextSafeAfter(norm, "inicio em ") else "",
                    tokensAfter  = if hasInicio then Text.SplitAny(SafeText(after), " ,.;:()") else {},
                    firstToken   = if hasInicio then List.First(List.Select(tokensAfter, each Text.Contains(_, "/")), null) else null,
                    baseDMY      = if firstToken <> null then TryParseDayMonthYear(firstToken) else null,
                    baseMY       = if baseDMY = null and firstToken <> null then TryParseMonthYear(firstToken) else null,
                    baseDate     = if baseDMY <> null then #date(Date.Year(baseDMY), Date.Month(baseDMY), 1) else baseMY,
                    insideParen  = if hasInicio and Text.Contains(SafeText(after), "(") and Text.Contains(SafeText(after), ")")
                                   then Text.BetweenDelimiters(SafeText(after), "(", ")") else "",
                    numsInside   = if insideParen <> "" then ExtractNumbers(insideParen) else {},
                    qtdExplicit  = if List.Count(numsInside) > 0 then numsInside{0} else null,
                    hasConsecutiv= TextSafeContains(after, "consecutiv"),
                    totalSeq     = if qtdExplicit <> null then Number.From(qtdExplicit)
                                   else if hasConsecutiv then meses_limit else null,
                    totalFinal   = if totalSeq <> null then List.Min({totalSeq, meses_limit}) else null,
                    seq =
                        if baseDate <> null and totalFinal <> null then
                            List.Transform({0..totalFinal-1}, each Date.AddMonths(baseDate, _))
                        else if baseDate <> null and totalFinal = null then
                            { baseDate }
                        else
                            {},
                    out = List.Accumulate(seq, lst, (acc,d)=> AddDate(acc, d))
                in out,

            // ---------- Pipeline ----------
            res1  = if rawNull = null then {} else resultInitial,
            res2  = if ambiguous then {} else res1,
            res3  = HandleAPartir(res2),
            res4  = HandleLists(res3),
            res5  = HandleCadaAno(res4),
            res6  = HandleUmaPorAno(res5),
            res6a = HandleInicioEm(res6),

            // Datas explícitas dd/mm/aaaa dispersas
            tokensAll = Text.SplitAny(s1, " ,.;:"),
            res7 = List.Accumulate(tokensAll, res6a, (acc,tok)=> AddDate(acc, TryParseDayMonthYear(tok))),

            ordered = List.Sort(List.Distinct(res7)),

            // Contagem de month-year explícitos para não cortar prematuramente
            explicitNormalized = Text.Replace(Text.Replace(rawSafe, "\n", ";"), " e ", ";"),
            explicitParts = List.Select(List.Transform(Text.Split(explicitNormalized, ";"), each Text.Trim(_)), each _ <> ""),
            explicitMYDates =
                List.RemoveNulls(
                    List.Combine(
                        List.Transform(
                            explicitParts,
                            (pp as text) =>
                                let pn        = NormalizeText(pp),
                                    toks      = Text.SplitAny(pn, " ,.:"),
                                    fromTokens= List.RemoveNulls(List.Transform(toks, each if Text.Contains(_, "/") then TryParseMonthYear(_) else null)),
                                    fromPhrase= { TryParseMonthYear(pn) },
                                    all       = List.Combine({fromTokens, fromPhrase})
                                in all
                        )
                    )
                ),
            explicitMYDistinct = List.Distinct(List.Transform(explicitMYDates, each FormatDate(_))),
            explicitCount      = List.Count(explicitMYDistinct),
            takeN              = if explicitCount > meses_limit then explicitCount else meses_limit,
            final              = if List.Count(ordered) > takeN then List.FirstN(ordered, takeN) else ordered
        in final,

    // ---------- Texto ----------
    ParseCronogramaText = (cronograma as nullable text, meses_limit as number, optional delimiter as text) as text =>
        let
            lst = ParseCronograma(cronograma, meses_limit),
            del = if (try delimiter otherwise null) = null then "; " else delimiter
        in Text.Combine(lst, del),

    // ---------- UDF Exposta ----------
    ParseCronogramaUDF = (meses as any, cronograma as any, optional _ignored as any) as list =>
        let
            mTry = try Number.From(meses) otherwise null,
            m    = if mTry = null or mTry < 1 then 1 else Number.RoundDown(mTry),
            cTxt = SafeText(cronograma),
            cron = if Text.Trim(cTxt) = "" then null else cTxt,
            lst  = ParseCronograma(cron, m)
        in lst

in
    ParseCronogramaUDF