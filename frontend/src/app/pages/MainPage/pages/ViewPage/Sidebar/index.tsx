/**
 * Datart
 *
 * Copyright 2021
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {
  CodeFilled,
  DeleteOutlined,
  FileOutlined,
  FolderFilled,
  FolderOpenFilled,
  FolderOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from '@ant-design/icons';
import { ListNav, ListPane, ListTitle } from 'app/components';
import { useDebouncedSearch } from 'app/hooks/useDebouncedSearch';
import useI18NPrefix from 'app/hooks/useI18NPrefix';
import { selectOrgId } from 'app/pages/MainPage/slice/selectors';
import { CommonFormTypes } from 'globalConstants';
import React, { memo, useCallback, useContext, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useHistory } from 'react-router-dom';
import styled from 'styled-components/macro';
import { SPACE_TIMES, SPACE_XS } from 'styles/StyleConstants';
import { getInsertedNodeIndex, uuidv4 } from 'utils/utils';
import { UNPERSISTED_ID_PREFIX } from '../constants';
import { SaveFormContext } from '../SaveFormContext';
import { useViewSlice } from '../slice';
import {
  makeSelectViewTree,
  selectArchived,
  selectSliderVisible,
  selectViews,
} from '../slice/selectors';
import { saveFolder } from '../slice/thunks';
import { ViewSimpleViewModel } from '../slice/types';
import { FolderTree } from './FolderTree';
import { Recycle } from './Recycle';

export const Sidebar = memo(({ isDragging }: { isDragging: boolean }) => {
  const history = useHistory();
  const dispatch = useDispatch();
  const { showSaveForm } = useContext(SaveFormContext);
  const orgId = useSelector(selectOrgId);
  const selectViewTree = useMemo(makeSelectViewTree, []);
  const viewsData = useSelector(selectViews);
  const t = useI18NPrefix('view.sidebar');
  const { actions: viewActions } = useViewSlice();
  const sliderVisible = useSelector(selectSliderVisible);

  const getIcon = useCallback(
    ({ isFolder }: ViewSimpleViewModel) =>
      isFolder ? (
        p => (p.expanded ? <FolderOpenFilled /> : <FolderFilled />)
      ) : (
        <CodeFilled />
      ),
    [],
  );
  const getDisabled = useCallback(
    ({ deleteLoading }: ViewSimpleViewModel) => deleteLoading,
    [],
  );

  const treeData = useSelector(state =>
    selectViewTree(state, { getIcon, getDisabled }),
  );

  const { filteredData: filteredTreeData, debouncedSearch: treeSearch } =
    useDebouncedSearch(treeData, (keywords, d) =>
      d.title.toLowerCase().includes(keywords.toLowerCase()),
    );
  const archived = useSelector(selectArchived);
  const recycleList = useMemo(
    () =>
      archived?.map(({ id, name, parentId, isFolder, deleteLoading }) => ({
        key: id,
        title: name,
        parentId,
        icon: isFolder ? <FolderOutlined /> : <FileOutlined />,
        isFolder,
        disabled: deleteLoading,
      })),
    [archived],
  );
  const { filteredData: filteredListData, debouncedSearch: listSearch } =
    useDebouncedSearch(recycleList, (keywords, d) =>
      d.title.toLowerCase().includes(keywords.toLowerCase()),
    );

  const add = useCallback(
    ({ key }) => {
      switch (key) {
        case 'view':
          history.push(
            `/organizations/${orgId}/views/${`${UNPERSISTED_ID_PREFIX}${uuidv4()}`}`,
          );
          break;
        case 'folder':
          showSaveForm({
            type: CommonFormTypes.Add,
            visible: true,
            simple: true,
            parentIdLabel: t('parent'),
            onSave: (values, onClose) => {
              let index = getInsertedNodeIndex(values, viewsData);

              dispatch(
                saveFolder({
                  folder: {
                    ...values,
                    parentId: values.parentId || null,
                    index,
                  },
                  resolve: onClose,
                }),
              );
            },
          });
          break;
        default:
          break;
      }
    },
    [dispatch, history, orgId, showSaveForm, viewsData, t],
  );

  const handleSliderVisible = useCallback(() => {
    dispatch(viewActions.changeVisibleStatus({ status: !sliderVisible }));
  }, [dispatch, viewActions, sliderVisible]);

  const titles = useMemo(
    () => [
      {
        key: 'list',
        title: t('title'),
        search: true,
        add: {
          items: [
            { key: 'view', text: t('addView') },
            { key: 'folder', text: t('addFolder') },
          ],
          callback: add,
        },
        more: {
          items: [
            {
              key: 'recycle',
              text: t('recycle'),
              prefix: <DeleteOutlined className="icon" />,
            },
            {
              key: 'fold',
              text: t(sliderVisible ? 'open' : 'close'),
              prefix: sliderVisible ? (
                <MenuUnfoldOutlined className="icon" />
              ) : (
                <MenuFoldOutlined className="icon" />
              ),
            },
          ],
          callback: (key, _, onNext) => {
            switch (key) {
              case 'recycle':
                onNext();
                break;
              case 'fold':
                handleSliderVisible();
                break;
            }
          },
        },
        onSearch: treeSearch,
      },
      {
        key: 'recycle',
        title: t('recycle'),
        back: true,
        search: true,
        onSearch: listSearch,
      },
    ],
    [add, treeSearch, listSearch, t, handleSliderVisible, sliderVisible],
  );

  return (
    <Wrapper
      sliderVisible={sliderVisible}
      className={sliderVisible ? 'close' : ''}
      isDragging={isDragging}
    >
      {sliderVisible ? (
        <MenuUnfoldOutlined
          className="menuUnfoldOutlined"
          onClick={() => {
            dispatch(
              viewActions.changeVisibleStatus({ status: !sliderVisible }),
            );
          }}
        />
      ) : (
        <></>
      )}
      <ListNavWrapper defaultActiveKey="list">
        <ListPane key="list">
          <ListTitle {...titles[0]} />
          <FolderTree treeData={filteredTreeData} />
        </ListPane>
        <ListPane key="recycle">
          <ListTitle {...titles[1]} />
          <Recycle list={filteredListData} />
        </ListPane>
      </ListNavWrapper>
    </Wrapper>
  );
});
const Wrapper = styled.div<{ sliderVisible: boolean; isDragging: boolean }>`
  transition: ${p => (!p.isDragging ? 'width 0.3s ease' : 'none')};
  height: 100%;
  &.close {
    width: ${SPACE_TIMES(7.5)} !important;
    border-right: 1px solid #e9ecef;
    position: absolute;
    height: 100%;
    background: #fff;
    .menuUnfoldOutlined {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
    }
    &:hover {
      width: 14.6789% !important;
      .menuUnfoldOutlined {
        display: none;
      }
      > div {
        display: flex;
        &.hidden {
          display: none;
        }
      }
    }
  }
  > div {
    display: ${p => (p.sliderVisible ? 'none' : 'flex')};
  }
`;
const ListNavWrapper = styled(ListNav)`
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  padding: ${SPACE_XS} 0;
  background-color: ${p => p.theme.componentBackground};
  border-right: 1px solid ${p => p.theme.borderColorSplit};
  height: 100%;
  position: relative;
  z-index: 111;
`;
