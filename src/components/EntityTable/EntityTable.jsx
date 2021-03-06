import React, { setState, useState } from 'react';
import { useHistory } from 'react-router-dom';

import { useTranslation } from 'react-i18next';

import { createStyles, makeStyles, Theme } from '@material-ui/core/styles';

import { useFilters, useGlobalFilter, useGroupBy, usePagination, useRowSelect, useSortBy, useTable } from 'react-table';

import TableToolbar from './TableToolbar'
import Table from '@material-ui/core/Table';
import TableCell from '@material-ui/core/TableCell';
import TableHead from '@material-ui/core/TableHead';
import TableBody from '@material-ui/core/TableBody';
import TableSortLabel from '@material-ui/core/TableSortLabel';
import TableRow from '@material-ui/core/TableRow';
import TableFooter from '@material-ui/core/TableFooter';
import TablePagination from '@material-ui/core/TablePagination';

import TablePaginationActions from './TablePaginationActions';
import EnhancedTableToolbar from './EnhancedTableToolbar';

import CircularProgress from '@material-ui/core/CircularProgress';

import { useCreateUserMutation } from '../../graphql';

/**
 * https://codesandbox.io/s/github/tannerlinsley/react-table/tree/master/examples/kitchen-sink
 * @param {*} props 
 */
export default function EntityTable(props) {
  const {
    columns = [],
    data,
    actions,
    entityName,
    loading,
    fetchData,
    defaultPageSize = 2,
    pageCount: controlledPageCount,
  } = props;

  const { t } = useTranslation('table');
  
  const styles = {
    invisable: {
      display: "none",
    },
    normal: {
      display: "",
    },
  }

  /**
   * pagination
   */

  const pageSizeOptions = [1, 2, 10, 20, 50, 100];

  var currentPageSize = defaultPageSize;
  if ("pageSize" in window) {
    currentPageSize =  pageSize;
  }
  var currentPageIndex = -1;
  if ("pageIndex" in window) {
    currentPageIndex = pageIndex;
  }

  /**
   * column filters constants
   */

  const [search, setSearch] = useState([]);

  // @todo below outcommented but is the key to different filter cells

  // function fuzzyTextFilterFn(rows, id, filterValue) {
  //   return matchSorter(rows, filterValue, { keys: [(row) => row.values[id]] });
  // }

  // // Let the table remove the filter if the string is empty
  // fuzzyTextFilterFn.autoRemove = (val) => !val;

  const filterTypes = React.useMemo(
    () => ({
      //     // Add a new fuzzyTextFilterFn filter type.
      // fuzzyText: fuzzyTextFilterFn,
      //     // Or, override the default text filter to use
      //     // "startWith"
      // text: (rows, id, filterValue) => {
      //       // return rows.filter((row) => {
      //       //   const rowValue = row.values[id];
      //       //   return rowValue !== undefined
      //       //     ? String(rowValue)
      //       //       .toLowerCase()
      //       //       .startsWith(String(filterValue).toLowerCase())
      //       //     : true;
      //       // });
      // },
    }),
    []
  );


  const defaultColumn = React.useMemo(
    () => ({
      // Let's set up our default Filter UI
      Filter: DefaultColumnFilter,
    }),
    []
  );

  // Use the state and functions returned from useTable to build your UI
  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    prepareRow,
    pageOptions,
    pageCount,
    page,
    preGlobalFilteredRows,
    setGlobalFilter,
    state: { selectedRowIds, pageSize, pageIndex, sortBy, hiddenColumns, entityName: entityNameFromTable, actions: actionsFromTable, globalFilter },
    gotoPage,
    previousPage,
    nextPage,
    setPageSize,
    canPreviousPage,
    canNextPage,
  } = useTable(
    {
      columns,
      data,
      initialState: {
        pageSize: currentPageSize,
        // pageIndex: 0,
        pageIndex: currentPageIndex,
        entityName,
        actions,
        // manualPagination: true,
        // pageCount: controlledPageCount,
      },
      defaultColumn, // Be sure to pass the defaultColumn option
      filterTypes,
      manualPagination: true,
      pageCount: controlledPageCount,
      // @todo
      useGlobalFilter,
      useSortBy,
      usePagination,
      useRowSelect
    },
    useFilters,
    useGlobalFilter,
    useSortBy,
    usePagination,
    useRowSelect
  );

  React.useEffect(() => {
    fetchData({ pageIndex, pageSize, search });
  }, [fetchData, pageIndex, pageSize, search]);

  const [oldPageIndex, setOldPageIndex] = React.useState(0);

  var newPageIndex = oldPageIndex;
  if (pageIndex > -1 && pageIndex != oldPageIndex ) {
    newPageIndex = pageIndex;
    setOldPageIndex(newPageIndex);
  }

  const deleteUserHandler = event => {
    const newData = removeByIndexs(
      data,
      Object.keys(selectedRowIds).map(x => parseInt(x, 10))
    )
    setData(newData)
  }

  const history = useHistory();

  const addUserHandler = user => {
    const newData = data.concat([user])

    const [create, { loading, error }] = useCreateUserMutation({
      variables: {
        name: user.name,
        email: user.email
      },
      onCompleted: () => {
        console.log('onCompleted')
        history.goBack();
      },
    });
  }

  // const currntNumSelected = Object.keys(selectedRowIds).length;
  // const currntNumSelected = selected.length;
  const currntNumSelected = 0;

  /**
   * select boxes
   */

  const [selected, setSelected] = React.useState([]);

  const handleSelectAllClick = event => {
    if (event.target.checked) {
      const newSelecteds = rows.map(n => n.name);
      setSelected(newSelecteds);
      return;
    }
    setSelected([]);
  };

  const handleClick = (event, name) => {
    const selectedIndex = selected.indexOf(name);
    let newSelected = [];

    if (selectedIndex === -1) {
      newSelected = newSelected.concat(selected, name);
    } else if (selectedIndex === 0) {
      newSelected = newSelected.concat(selected.slice(1));
    } else if (selectedIndex === selected.length - 1) {
      newSelected = newSelected.concat(selected.slice(0, -1));
    } else if (selectedIndex > 0) {
      newSelected = newSelected.concat(
        selected.slice(0, selectedIndex),
        selected.slice(selectedIndex + 1),
      );
    }

    setSelected(newSelected);
  };
  
  const isSelected = name => selected.indexOf(name) !== -1;

  /**
   * column filters
   */

  // https://codesandbox.io/s/github/tannerlinsley/react-table/tree/master/examples/filtering
  // Define a default UI for filtering
  function DefaultColumnFilter(props) {
    const {
      fieldName,
      column: { filterValue, preFilteredRows, setFilter },
    } = props;
    const count = preFilteredRows.length;
    return (
      <input
        value={filterValue || ''}
        onChange={(e) => {
          setFilter(e.target.value || undefined); // Set undefined to remove the filter entirely
          // store search and perform graphql
          search[fieldName] = e.target.value;
          fetchData({ pageIndex, pageSize, searchTerms: search });
        }}
        placeholder={t("Search records")}
        name={fieldName}
      />
    );
  }

  // Render the UI for your table
  return loading ? (
    <CircularProgress />
  ) : (
    <div>
      <TableToolbar
        // numSelected={Object.keys(selectedRowIds).length}
        numSelected={currntNumSelected}
        deleteUserHandler={deleteUserHandler}
        addUserHandler={addUserHandler}
        preGlobalFilteredRows={preGlobalFilteredRows}
        setGlobalFilter={setGlobalFilter}
        globalFilter={globalFilter || ''}
      />
      {/* <EnhancedTableToolbar
        // numSelected={Object.keys(selectedRowIds).length}
        numSelected={currntNumSelected}
        deleteUserHandler={deleteUserHandler}
        addUserHandler={addUserHandler}
        preGlobalFilteredRows={preGlobalFilteredRows}
        setGlobalFilter={setGlobalFilter}
        globalFilter={globalFilter || ''}
      /> */}
      <Table {...getTableProps()}>
      <TableHead>
          {headerGroups.map(headerGroup => (
            <TableRow {...headerGroup.getHeaderGroupProps()}>
              {headerGroup.headers.map((column, index) => (
                  <TableCell
                    {...(column.id === 'selection'
                      ? column.getHeaderProps()
                      : column.getHeaderProps(column.getSortByToggleProps()))}
                    style={index === 0 ? styles.invisable : styles.normal}
                  >
                  {column.render('Header')}
                  {column.id !== 'selection' ? (
                    <TableSortLabel
                      active={column.isSorted}
                      // react-table has a unsorted state which is not treated here
                      direction={column.isSortedDesc ? 'desc' : 'asc'}
                    />
                  ) : null}
                  <div>{column.canFilter ? column.render('Filter', { fieldName: column.id }) : null}</div>
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableHead>
        <TableBody {...getTableBodyProps()}>
          {page.map((row, i) => {
            const isItemSelected = isSelected(row.name);
            prepareRow(row);
            return (
              <TableRow {...row.getRowProps()}>
                {row.cells.map((cell, index) => {
                  const style = index === 0 ? styles.invisable : styles.normal;
                  return (
                      <TableCell style={style} {...cell.getCellProps()}>{cell.render('Cell')}</TableCell>
                  )
                })}
              </TableRow>
            );
          })}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TablePagination
              count={controlledPageCount}
              page={newPageIndex}
              rowsPerPage={pageSize}
              rowsPerPageOptions={pageSizeOptions}
              labelRowsPerPage={t("Show")}
              onChangeRowsPerPage={(e) => {
                const newPageSize = Number(e.target.value);
                setPageSize(newPageSize);
                currentPageSize = newPageSize;
                // this.forceUpdate();
                // setData({data});
                // setverState({page});
              }}
              onChangePage={(e, page) => gotoPage(e, page)}
              ActionsComponent={TablePaginationActions}
            />
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  );
}
